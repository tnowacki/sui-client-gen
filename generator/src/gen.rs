use std::collections::{BTreeMap, HashMap};

use anyhow::{bail, Result};
use convert_case::{Case, Casing};
use genco::prelude::*;
use genco::tokens::{Item, ItemStr};
use move_binary_format::normalized::Type as MType;
use move_core_types::account_address::AccountAddress;
use move_model::model::{DatatypeId, FieldEnv, FunctionEnv, GlobalEnv, ModuleEnv, StructEnv};
use move_model::symbol::{Symbol, SymbolPool};
use move_model::ty::{PrimitiveType, Type};

use crate::model_builder::{TypeOriginTable, VersionTable};

#[rustfmt::skip]
const JS_RESERVED_WORDS: [&str; 64] = [
    "abstract", "arguments", "await", "boolean", "break", "byte", "case", "catch",
    "char", "class", "const", "continue", "debugger", "default", "delete", "do",
    "double", "else", "enum", "eval", "export", "extends", "false", "final",
    "finally", "float", "for", "function", "goto", "if", "implements", "import",
    "in", "instanceof", "int", "interface", "let", "long", "native", "new",
    "null", "package", "private", "protected", "public", "return", "short", "static",
    "super", "switch", "synchronized", "this", "throw", "throws", "transient", "true",
    "try", "typeof", "var", "void", "volatile", "while", "with", "yield"
];

#[rustfmt::skip]
const JS_STRICTLY_RESERVED_WORDS: [&str; 37] = [
    "await", "break", "case", "catch", "class", "const", "continue", "debugger",
    "default", "delete", "do", "else", "export", "extends", "false", "finally",
    "for", "function", "if", "import", "in", "instanceof", "new", "null", "return",
    "super", "switch", "this", "throw", "true", "try", "typeof", "var", "void",
    "while", "with", "yield"
];

/// Returns module name that's used in import paths (converts kebab case as that's idiomatic in TS).
pub fn module_import_name(module: &ModuleEnv) -> String {
    module
        .get_name()
        .display(module.env.symbol_pool())
        .to_string()
        .from_case(Case::Snake)
        .to_case(Case::Kebab)
}

/// Returns package name that's used in import paths (converts to kebab case as that's idiomatic in TS).
pub fn package_import_name(pkg_name: move_symbol_pool::Symbol) -> String {
    pkg_name
        .to_string()
        .from_case(Case::Pascal)
        .to_case(Case::Kebab)
}

pub struct FrameworkImportCtx {
    framework_rel_path: String,
}

impl FrameworkImportCtx {
    pub fn new(levels_from_root: u8) -> Self {
        let framework_rel_path = if levels_from_root == 0 {
            "./_framework".to_string()
        } else {
            (0..levels_from_root)
                .map(|_| "..")
                .collect::<Vec<_>>()
                .join("/")
                + "/_framework"
        };

        FrameworkImportCtx { framework_rel_path }
    }

    pub fn import(&self, module: &str, name: &str) -> js::Import {
        js::import(format!("{}/{}", self.framework_rel_path, module), name)
    }
}

/// A context for generating import paths for struct classes. This is needed to avoid name conflicts
/// when importing different structs of the same name.
pub struct StructClassImportCtx<'env, 'a> {
    // a map storing class names that have already been used and their import paths
    // to avoid name conflicts
    reserved_names: HashMap<String, Vec<String>>,
    module: &'env ModuleEnv<'env>,
    is_top_level: bool,
    is_source: bool,
    top_level_pkg_names: &'a BTreeMap<AccountAddress, move_symbol_pool::Symbol>,
    is_structs_gen: bool,
}

impl<'env, 'a> StructClassImportCtx<'env, 'a> {
    fn new(
        reserved_names: Vec<String>,
        module: &'env ModuleEnv,
        is_source: bool,
        top_level_pkg_names: &'a BTreeMap<AccountAddress, move_symbol_pool::Symbol>,
        is_structs_gen: bool,
    ) -> Self {
        StructClassImportCtx {
            reserved_names: reserved_names
                .into_iter()
                .map(|name| (name, vec!["".to_string()]))
                .collect(),
            module,
            is_top_level: top_level_pkg_names.contains_key(module.self_address()),
            is_source,
            top_level_pkg_names,
            is_structs_gen,
        }
    }

    pub fn for_func_gen(
        module: &'env ModuleEnv,
        is_source: bool,
        top_level_pkg_names: &'a BTreeMap<AccountAddress, move_symbol_pool::Symbol>,
    ) -> Self {
        let reserved_names = vec![];
        let is_structs_gen = false;
        StructClassImportCtx::new(
            reserved_names,
            module,
            is_source,
            top_level_pkg_names,
            is_structs_gen,
        )
    }

    pub fn for_struct_gen(
        module: &'env ModuleEnv,
        is_source: bool,
        top_level_pkg_names: &'a BTreeMap<AccountAddress, move_symbol_pool::Symbol>,
    ) -> Self {
        let struct_names = module.get_structs().map(|strct| {
            strct
                .get_name()
                .display(module.env.symbol_pool())
                .to_string()
        });
        let enum_names = module
            .get_enums()
            .map(|enm| enm.get_name().display(module.env.symbol_pool()).to_string());

        let reserved_names = struct_names.chain(enum_names).collect();
        let is_structs_gen = true;

        StructClassImportCtx::new(
            reserved_names,
            module,
            is_source,
            top_level_pkg_names,
            is_structs_gen,
        )
    }

    /// Returns the import path for a struct. If the struct is defined in the current module,
    /// returns `None`.
    pub fn import_path_for_struct(&self, strct: &StructEnv) -> Option<String> {
        let module_name = module_import_name(&strct.module_env);

        if strct.module_env.self_address() == self.module.self_address()
            && strct.module_env.get_id() == self.module.get_id()
        {
            // if the struct is defined in the current module, we don't need to import anything
            if self.is_structs_gen {
                None
            } else {
                Some("./structs".to_string())
            }
        } else if strct.module_env.self_address() == self.module.self_address() {
            // if the struct is defined in a different module in the same package, we use
            // the short version of the import path
            Some(format!("../{}/structs", module_name))
        } else {
            let strct_is_top_level = self
                .top_level_pkg_names
                .contains_key(strct.module_env.self_address());

            if self.is_top_level && strct_is_top_level {
                let strct_pkg_name = package_import_name(
                    *self
                        .top_level_pkg_names
                        .get(strct.module_env.self_address())
                        .unwrap(),
                );

                Some(format!("../../{}/{}/structs", strct_pkg_name, module_name))
            } else if self.is_top_level {
                let dep_dir = if self.is_source { "source" } else { "onchain" };

                Some(format!(
                    "../../_dependencies/{}/{}/{}/structs",
                    dep_dir,
                    strct.module_env.self_address().to_hex_literal(),
                    module_name
                ))
            } else if strct_is_top_level {
                let strct_pkg_name = package_import_name(
                    *self
                        .top_level_pkg_names
                        .get(strct.module_env.self_address())
                        .unwrap(),
                );

                Some(format!(
                    "../../../../{}/{}/structs",
                    strct_pkg_name, module_name
                ))
            } else {
                Some(format!(
                    "../../{}/{}/structs",
                    strct.module_env.self_address().to_hex_literal(),
                    module_name
                ))
            }
        }
    }

    fn name_into_import(&self, path: &str, name: &str, idx: usize) -> js::Import {
        match idx {
            0 => js::import(path, name),
            _ => js::import(path, name).with_alias(format!("{}{}", name, idx)),
        }
    }

    /// Returns the class name for a struct and imports it if necessary. If a class with the same name
    /// has already been imported, imports it with an alias (e.g. Foo1, Foo2, etc.).
    pub fn get_class(&mut self, strct: &StructEnv) -> js::Tokens {
        let class_name = strct.get_name().display(strct.symbol_pool()).to_string();
        let import_path = self.import_path_for_struct(strct);

        let import_path = match import_path {
            None => return quote!($class_name),
            Some(import_path) => import_path,
        };

        match self.reserved_names.get_mut(&class_name) {
            None => {
                self.reserved_names
                    .insert(class_name.clone(), vec![import_path.clone()]);
                let ty = self.name_into_import(&import_path, &class_name, 0);
                quote!($ty)
            }
            Some(paths) => {
                let idx = paths.iter().position(|path| path == &import_path);
                match idx {
                    None => {
                        let idx = paths.len();
                        paths.push(import_path.clone());
                        let ty = self.name_into_import(&import_path, &class_name, idx);
                        quote!($ty)
                    }
                    Some(idx) => {
                        let ty = self.name_into_import(&import_path, &class_name, idx);
                        quote!($ty)
                    }
                }
            }
        }
    }
}

fn get_origin_pkg_addr(strct: &StructEnv, type_origin_table: &TypeOriginTable) -> AccountAddress {
    let addr = strct.module_env.self_address();
    let types = type_origin_table.get(addr).unwrap_or_else(|| {
        panic!(
            "expected origin table to exist for packge {}",
            addr.to_hex_literal()
        )
    });
    let origin_addr = types.get(&strct.get_full_name_str()).unwrap_or_else(|| {
        panic!(
            "unable to find origin address for struct {} in package {}. \
            check consistency between original id and published at for this package.",
            strct.get_full_name_str(),
            addr.to_hex_literal()
        )
    });

    *origin_addr
}

fn get_full_name_with_address_str(
    strct: &StructEnv,
    type_origin_table: &TypeOriginTable,
) -> String {
    let origin_pkg_addr = get_origin_pkg_addr(strct, type_origin_table);
    format!(
        "{}::{}",
        origin_pkg_addr.to_hex_literal(),
        strct.get_full_name_str()
    )
}

fn gen_full_name_with_address(
    strct: &StructEnv,
    type_origin_table: &TypeOriginTable,
    version_table: &VersionTable,
    open_quote: bool,
    as_type: bool,
) -> js::Tokens {
    let origin_pkg_addr = get_origin_pkg_addr(strct, type_origin_table);
    let self_addr = strct.module_env.self_address();
    let versions = version_table.get(self_addr).unwrap_or_else(|| {
        panic!(
            "expected version table to exist for packge {}",
            self_addr.to_hex_literal()
        )
    });
    let version = versions.get(&origin_pkg_addr).unwrap_or_else(|| {
        panic!(
            "expected version to exist for package {} in package {}",
            origin_pkg_addr.to_hex_literal(),
            self_addr.to_hex_literal()
        )
    });
    let pkg_import = js::import("../index", format!("PKG_V{}", version.value()));

    // `${PKG_V1}::module::name`
    let mut toks = js::Tokens::new();
    if open_quote {
        toks.append(Item::OpenQuote(true));
    }
    toks.append(Item::Literal(ItemStr::from("${")));
    if as_type {
        quote_in!(toks => typeof $pkg_import)
    } else {
        quote_in!(toks => $pkg_import);
    }
    toks.append(Item::Literal(ItemStr::from("}")));
    quote_in!(toks => ::$(strct.get_full_name_str()));
    if open_quote {
        toks.append(Item::CloseQuote);
    }

    toks
}

pub fn gen_package_init_ts(modules: &[ModuleEnv], framework: &FrameworkImportCtx) -> js::Tokens {
    let struct_class_loader = &framework.import("loader", "StructClassLoader");
    // TODO use canonical module names
    quote! {
        export function registerClasses(loader: $struct_class_loader) {
            $(ref toks {
                for module in modules.iter() {
                    let module_name = module
                        .get_name()
                        .display(module.env.symbol_pool())
                        .to_string();

                    let mut imported_name = module_name.to_case(Case::Camel);
                    if JS_RESERVED_WORDS.contains(&imported_name.as_str()) {
                        imported_name.push('_');
                    }

                    let module_import = &js::import(
                        format!("./{}/structs", module_import_name(module)),
                        imported_name,
                    )
                    .into_wildcard();

                    for strct in module.get_structs() {
                        let strct_name = strct
                            .get_name()
                            .display(module.env.symbol_pool())
                            .to_string();

                        quote_in! { *toks =>
                            loader.register($(module_import).$(strct_name));$['\r']
                        }
                    }
                }
            })
        }
    }
}

fn gen_init_loader_register_classes_fn_body_toks(
    pkg_ids: Vec<AccountAddress>,
    top_level_pkg_names: &BTreeMap<AccountAddress, move_symbol_pool::Symbol>,
    is_source: bool,
    toks: &mut js::Tokens,
) {
    for pkg_id in pkg_ids {
        let pkg_init_path = match top_level_pkg_names.get(&pkg_id) {
            Some(pkg_name) => {
                format!("../{}/init", package_import_name(*pkg_name))
            }
            None => {
                if is_source {
                    format!("../_dependencies/source/{}/init", pkg_id.to_hex_literal())
                } else {
                    format!("../_dependencies/onchain/{}/init", pkg_id.to_hex_literal())
                }
            }
        };

        let prefix = if is_source {
            "package_source"
        } else {
            "package_onchain"
        };

        let pkg_import = &js::import(
            pkg_init_path,
            format!("{}_{}", prefix, pkg_id.short_str_lossless()),
        )
        .into_wildcard();

        quote_in! { *toks =>
            $(pkg_import).registerClasses(loader);$['\r']
        }
    }
}

pub fn gen_init_loader_ts(
    source_pkgs_info: Option<(
        Vec<AccountAddress>,
        &BTreeMap<AccountAddress, move_symbol_pool::Symbol>,
    )>,
    onchain_pkgs_info: Option<(
        Vec<AccountAddress>,
        &BTreeMap<AccountAddress, move_symbol_pool::Symbol>,
    )>,
) -> js::Tokens {
    let struct_class_loader = &js::import("./loader", "StructClassLoader");

    let mut toks = js::Tokens::new();

    match &source_pkgs_info {
        Some((pkg_ids, top_level_pkg_names)) => quote_in!(toks =>
            function registerClassesSource(loader: $struct_class_loader) {
                $(ref toks {
                    gen_init_loader_register_classes_fn_body_toks(pkg_ids.clone(), top_level_pkg_names, true, toks)
                })
            }$['\n']
        ),
        None => (),
    };

    match &onchain_pkgs_info {
        Some((pkg_ids, top_level_pkg_names)) => quote_in!(toks =>
            function registerClassesOnchain(loader: $struct_class_loader) {
                $(ref toks {
                    gen_init_loader_register_classes_fn_body_toks(pkg_ids.clone(), top_level_pkg_names, false, toks)
                })
            }$['\n']
        ),
        None => (),
    };

    match (&source_pkgs_info, &onchain_pkgs_info) {
        (None, None) => quote_in!(toks => {
            export function registerClasses(_: $struct_class_loader) { }$['\n']
        }),
        (Some(_), None) => quote_in!(toks =>
            export function registerClasses(loader: $struct_class_loader) {
                registerClassesSource(loader);
            }$['\n']
        ),
        (None, Some(_)) => quote_in!(toks =>
            export function registerClasses(loader: $struct_class_loader) {
                registerClassesOnchain(loader);
            }$['\n']
        ),
        (Some(_), Some(_)) => quote_in!(toks =>
            export function registerClasses(loader: $struct_class_loader) {
                registerClassesOnchain(loader);
                registerClassesSource(loader);
            }$['\n']
        ),
    };

    toks
}

/// Generates `typeArgs` param for a function that takes type arguments.
/// E.g. `typeArgs: [string, string]` or `typeArg: string`.
fn gen_type_args_param(
    count: usize,
    prefix: impl FormatInto<JavaScript>,
    suffix: impl FormatInto<JavaScript>,
) -> impl FormatInto<JavaScript> {
    quote! {
        $(match count {
            0 => (),
            1 => $(prefix)typeArg: string$suffix,
            _ => $(prefix)typeArgs: [$(for _ in 0..count join (, ) => string)]$suffix
        })
    }
}

enum QuoteItem {
    Interpolated(Tokens<JavaScript>),
    #[allow(dead_code)]
    Literal(String),
}

fn todo_panic_if_enum(module: &ModuleEnv, id: &DatatypeId) {
    if module.find_enum(id.symbol()).is_some() {
        todo!("enums are not supported yet")
    }
}

fn gen_bcs_def_for_type(
    ty: &Type,
    env: &GlobalEnv,
    type_param_names: &Vec<QuoteItem>,
    import_ctx: &mut StructClassImportCtx,
) -> js::Tokens {
    let mut toks = js::Tokens::new();
    toks.append(Item::OpenQuote(true));

    fn inner(
        toks: &mut Tokens<JavaScript>,
        ty: &Type,
        env: &GlobalEnv,
        type_param_names: &Vec<QuoteItem>,
        import_ctx: &mut StructClassImportCtx,
    ) {
        match ty {
            Type::TypeParameter(idx) => match &type_param_names[*idx as usize] {
                QuoteItem::Interpolated(s) => {
                    toks.append(Item::Literal(ItemStr::from("${")));
                    quote_in! ( *toks => $(s.clone()));
                    toks.append(Item::Literal(ItemStr::from("}")));
                }
                QuoteItem::Literal(s) => toks.append(Item::Literal(ItemStr::from(s))),
            },
            Type::Datatype(mid, sid, ts) => {
                let module_env = env.get_module(*mid);
                todo_panic_if_enum(&module_env, sid);

                let struct_env = module_env.into_struct(*sid);
                let class = import_ctx.get_class(&struct_env);

                toks.append(Item::Literal(ItemStr::from("${")));
                quote_in! { *toks => $(class).$$typeName };
                toks.append(Item::Literal(ItemStr::from("}")));

                if !ts.is_empty() {
                    quote_in! { *toks => < };
                    let len = ts.len();
                    for (i, ty) in ts.iter().enumerate() {
                        inner(toks, ty, env, type_param_names, import_ctx);
                        if i != len - 1 {
                            quote_in! { *toks => , };
                            toks.space()
                        }
                    }
                    quote_in! { *toks => > };
                }
            }
            Type::Vector(ty) => {
                quote_in! { *toks => vector< };
                inner(toks, ty, env, type_param_names, import_ctx);
                quote_in! { *toks => > };
            }
            Type::Primitive(ty) => match ty {
                PrimitiveType::U8 => quote_in!(*toks => u8),
                PrimitiveType::U16 => quote_in!(*toks => u16),
                PrimitiveType::U32 => quote_in!(*toks => u32),
                PrimitiveType::U64 => quote_in!(*toks => u64),
                PrimitiveType::U128 => quote_in!(*toks => u128),
                PrimitiveType::U256 => quote_in!(*toks => u256),
                PrimitiveType::Bool => quote_in!(*toks => bool),
                PrimitiveType::Address => quote_in!(*toks => address),
                PrimitiveType::Signer => quote_in!(*toks => signer),
                _ => panic!("unexpected type: {:?}", ty),
            },
            _ => panic!("unexpected type: {:?}", ty),
        }
    }

    inner(&mut toks, ty, env, type_param_names, import_ctx);
    toks.append(Item::CloseQuote);

    toks
}

pub struct FunctionsGen<'env, 'a> {
    env: &'env GlobalEnv,
    framework: FrameworkImportCtx,
    import_ctx: StructClassImportCtx<'env, 'a>,
}

impl<'env, 'a> FunctionsGen<'env, 'a> {
    pub fn new(
        env: &'env GlobalEnv,
        framework: FrameworkImportCtx,
        import_ctx: StructClassImportCtx<'env, 'a>,
    ) -> Self {
        FunctionsGen {
            env,
            framework,
            import_ctx,
        }
    }

    fn symbol_pool(&self) -> &SymbolPool {
        self.env.symbol_pool()
    }

    fn gen_bcs_def_for_type(&mut self, ty: &Type, type_param_names: &Vec<QuoteItem>) -> js::Tokens {
        gen_bcs_def_for_type(ty, self.env, type_param_names, &mut self.import_ctx)
    }

    fn field_name_from_type(&self, ty: &Type, type_param_names: Vec<Symbol>) -> Result<String> {
        let name = match ty {
            Type::Primitive(ty) => format!("{}", ty),
            Type::Vector(ty) => {
                "vec".to_string()
                    + &self
                        .field_name_from_type(ty, type_param_names)?
                        .to_case(Case::Pascal)
            }
            Type::Datatype(mid, sid, _) => {
                let module = self.env.get_module(*mid);
                todo_panic_if_enum(&module, sid);

                module
                    .get_struct(*sid)
                    .get_identifier()
                    .unwrap()
                    .to_string()
                    .to_case(Case::Camel)
            }
            Type::Reference(_, ty) => self.field_name_from_type(ty, type_param_names)?,
            Type::TypeParameter(idx) => type_param_names[*idx as usize]
                .display(self.symbol_pool())
                .to_string()
                .to_case(Case::Camel),
            _ => bail!(
                "unexpected type: {}",
                ty.display(&self.env.get_type_display_ctx())
            ),
        };
        Ok(name)
    }

    fn param_to_field_name(
        &self,
        name: Option<Symbol>,
        type_: &Type,
        type_param_names: Vec<Symbol>,
    ) -> String {
        if let Some(name) = name {
            let mut name = name
                .display(self.symbol_pool())
                .to_string()
                .to_case(Case::Camel);

            // When the param name is `_` we use the type as the field name.
            if name.is_empty() {
                name = self.field_name_from_type(type_, type_param_names).unwrap();
            };

            name
        } else {
            self.field_name_from_type(type_, type_param_names).unwrap()
        }
    }

    fn is_tx_context(&self, ty: &Type) -> bool {
        match ty {
            Type::Datatype(mid, sid, ts) => {
                let module_env = self.env.get_module(*mid);
                if module_env.find_enum(sid.symbol()).is_some() {
                    return false;
                }

                match self.env.get_datatype(*mid, *sid, ts).unwrap() {
                    MType::Struct {
                        address,
                        module,
                        name,
                        type_arguments: _,
                    } => {
                        address == AccountAddress::TWO
                            && module.into_string() == "tx_context"
                            && name.into_string() == "TxContext"
                    }
                    _ => panic!(),
                }
            }
            Type::Reference(_, ty) => self.is_tx_context(ty),
            _ => false,
        }
    }

    /// Returns type parameter names for a function. If type parameter names are not defined
    /// it will return `T0`, `T1`, etc.
    fn func_type_param_names(&self, func: &FunctionEnv) -> Vec<Symbol> {
        func.get_named_type_parameters()
            .into_iter()
            .map(|param| {
                let name = param.0.display(self.symbol_pool()).to_string();

                if name.starts_with("unknown#") {
                    let name = name.replace("unknown#", "T");
                    self.symbol_pool().make(&name)
                } else {
                    param.0
                }
            })
            .collect()
    }

    // Generates TS interface field names from function's params. Used in the `<..>Args` interface
    // or function binding params.
    // If the param names are not defined (e.g. `_`), it will generate a name based on the type.
    // In case this causes a name collision, it will append a number to the name.
    fn params_to_field_names(
        &self,
        func: &FunctionEnv,
        ignore_tx_context: bool,
    ) -> Vec<(String, Type)> {
        let params = func.get_parameters();
        let param_types = func.get_parameter_types();
        let type_param_names = self.func_type_param_names(func);

        let param_to_field_name = |idx: usize| {
            // When there are no named parameters (e.g. on-chain modules), the `params` vector
            // will always be empty. In this case, we generate names based on the type.
            if params.len() == func.get_parameter_count() {
                let param = &params[idx];
                self.param_to_field_name(Some(param.0), &param.1, type_param_names.clone())
            } else {
                let type_ = &param_types[idx];
                self.param_to_field_name(None, type_, type_param_names.clone())
            }
        };

        let mut name_count = HashMap::<String, usize>::new();

        #[allow(clippy::needless_range_loop)]
        for idx in 0..func.get_parameter_count() {
            let type_ = &param_types[idx];
            if ignore_tx_context && self.is_tx_context(type_) {
                continue;
            }

            let name = param_to_field_name(idx);
            let count = name_count.get(&name).map(|count| *count + 1).unwrap_or(1);
            name_count.insert(name, count);
        }

        let mut current_count = HashMap::<String, usize>::new();

        (0..func.get_parameter_count())
            .filter_map(|idx| {
                let type_ = param_types[idx].clone();
                if ignore_tx_context && self.is_tx_context(&type_) {
                    return None;
                }

                let mut name = param_to_field_name(idx);
                let total_count = name_count.get(&name).unwrap();

                let i = current_count
                    .get(&name)
                    .map(|count| *count + 1)
                    .unwrap_or(1);
                current_count.insert(name.clone(), i);

                name = if *total_count > 1 {
                    format!("{}{}", name, i)
                } else {
                    name
                };

                Some((name, type_))
            })
            .collect()
    }

    fn fun_arg_if_name(func: &FunctionEnv) -> String {
        let name = func.get_name_str();

        // function names ending with `_` are common, so handle this specifically
        // TODO: remove this once there's a more general way to handle this
        if name.ends_with('_') {
            return name.from_case(Case::Snake).to_case(Case::Pascal) + "_Args";
        } else {
            return name.from_case(Case::Snake).to_case(Case::Pascal) + "Args";
        }
    }

    /// Generates a TS type for a function's parameter type. Used in the `<..>Args` interface.
    fn param_type_to_field_type(&self, ty: &Type) -> js::Tokens {
        let generic_arg = &self.framework.import("util", "GenericArg");
        let transaction_argument = &js::import("@mysten/sui/transactions", "TransactionArgument");
        let transaction_object_input =
            &js::import("@mysten/sui/transactions", "TransactionObjectInput");

        match ty {
            Type::Primitive(ty) => match ty {
                PrimitiveType::U8 | PrimitiveType::U16 | PrimitiveType::U32 => {
                    quote!(number | $transaction_argument)
                }
                PrimitiveType::U64 | PrimitiveType::U128 | PrimitiveType::U256 => {
                    quote!(bigint | $transaction_argument)
                }
                PrimitiveType::Bool => quote!(boolean | $transaction_argument),
                PrimitiveType::Address => quote!(string | $transaction_argument),
                PrimitiveType::Signer => quote!(string | $transaction_argument),
                _ => panic!("unexpected primitive type: {:?}", ty),
            },
            Type::Vector(ty) => {
                quote!(Array<$(self.param_type_to_field_type(ty))> | $transaction_argument)
            }
            Type::Datatype(mid, sid, ts) => {
                let module = self.env.get_module(*mid);
                todo_panic_if_enum(&module, sid);

                let strct = module.get_struct(*sid);

                match strct.get_full_name_with_address().as_ref() {
                    "0x1::string::String" | "0x1::ascii::String" => {
                        quote!(string | $transaction_argument)
                    }
                    "0x2::object::ID" => quote!(string | $transaction_argument),
                    "0x1::option::Option" => {
                        quote!(($(self.param_type_to_field_type(&ts[0])) | $(transaction_argument) | null))
                    }
                    _ => quote!($transaction_object_input),
                }
            }
            Type::Reference(_, ty) => self.param_type_to_field_type(ty),
            Type::TypeParameter(_) => quote!($generic_arg),
            _ => panic!("unexpected type: {:?}", ty),
        }
    }

    /// Generates the `<..>Args` interface for a function.
    pub fn gen_fun_args_if(
        &self,
        func: &FunctionEnv,
        tokens: &mut Tokens<JavaScript>,
    ) -> Result<()> {
        let param_field_names = self.params_to_field_names(func, true);
        if param_field_names.len() < 2 {
            return Ok(());
        }

        quote_in! { *tokens =>
            export interface $(FunctionsGen::fun_arg_if_name(func)) {
                $(for (field_name, param_type) in param_field_names join (; )=>
                    $field_name: $(self.param_type_to_field_type(&param_type))
                )
            }$['\n']
        };

        Ok(())
    }

    fn is_pure(&self, ty: &Type) -> bool {
        match ty {
            Type::Primitive(_) => true,
            Type::Reference(_, ty) => self.is_pure(ty),
            Type::Vector(ty) => self.is_pure(ty),
            Type::Datatype(mid, sid, ts) => {
                let module = self.env.get_module(*mid);
                todo_panic_if_enum(&module, sid);

                let strct = module.get_struct(*sid);

                match strct.get_full_name_with_address().as_ref() {
                    "0x1::string::String" | "0x1::ascii::String" => true,
                    "0x2::object::ID" => true,
                    "0x1::option::Option" => self.is_pure(&ts[0]),
                    _ => false,
                }
            }
            _ => false,
        }
    }

    // returns Option's type argument if the type is Option
    fn is_option<'b>(&self, ty: &'b Type) -> Option<&'b Type> {
        match ty {
            Type::Datatype(mid, sid, ts) => {
                let module = self.env.get_module(*mid);
                todo_panic_if_enum(&module, sid);

                let strct = module.get_struct(*sid);

                match strct.get_full_name_with_address().as_ref() {
                    "0x1::option::Option" => Some(&ts[0]),
                    _ => None,
                }
            }
            Type::Reference(_, ty) => self.is_option(ty),
            _ => None,
        }
    }

    #[allow(clippy::only_used_in_recursion)]
    fn type_strip_ref(&self, ty: Type) -> Type {
        match ty {
            Type::Reference(_, ty) => self.type_strip_ref(*ty),
            _ => ty,
        }
    }

    fn param_to_tx_arg(
        &mut self,
        ty: Type,
        arg_field_name: String,
        func_type_param_names: Vec<Symbol>,
        single_param: bool,
    ) -> js::Tokens {
        let import_with_possible_alias = |field_name: &str| {
            if single_param && arg_field_name == field_name {
                self.framework
                    .import("util", field_name)
                    .with_alias(field_name.to_owned() + "_")
            } else {
                self.framework.import("util", field_name)
            }
        };
        let obj = import_with_possible_alias("obj");
        let pure = import_with_possible_alias("pure");
        let generic = import_with_possible_alias("generic");
        let vector = import_with_possible_alias("vector");
        let option = import_with_possible_alias("option");

        let num_type_params = func_type_param_names.len();
        let type_param_names = match num_type_params {
            0 => vec![],
            1 => vec![QuoteItem::Interpolated(quote!(typeArg))],
            _ => (0..num_type_params)
                .map(|idx| QuoteItem::Interpolated(quote!(typeArgs[$idx])))
                .collect::<Vec<_>>(),
        };

        let ty = self.type_strip_ref(ty);
        let ty_tok = self.gen_bcs_def_for_type(&ty, &type_param_names);

        if self.is_pure(&ty) {
            quote!($pure(tx, $arg_field_name, $ty_tok))
        } else if let Some(ty) = self.is_option(&ty) {
            let ty_tok = self.gen_bcs_def_for_type(ty, &type_param_names);
            quote!($option(tx, $ty_tok, $arg_field_name))
        } else {
            match ty {
                Type::TypeParameter(_) => {
                    let ty_tok = self.gen_bcs_def_for_type(&ty, &type_param_names);
                    quote!($generic(tx, $ty_tok, $arg_field_name))
                }
                Type::Vector(ty) => {
                    let ty_tok = self.gen_bcs_def_for_type(&ty, &type_param_names);
                    quote!($vector(tx, $ty_tok, $arg_field_name))
                }
                _ => {
                    quote!($obj(tx, $arg_field_name))
                }
            }
        }
    }

    /// Returns the TS function binding name for a function.
    pub fn fun_name(func: &FunctionEnv) -> String {
        let mut fun_name_str = func
            .get_name_str()
            .from_case(Case::Snake)
            .to_case(Case::Camel);
        if JS_RESERVED_WORDS.contains(&fun_name_str.as_str()) {
            fun_name_str.push('_');
        };
        // function names ending with `_` are common, so handle this specifically
        // TODO: remove this once there's a more general way to handle this
        if func.get_name_str().ends_with('_') {
            fun_name_str.push('_');
        }
        fun_name_str
    }

    /// Generates a function binding for a function.
    pub fn gen_fun_binding(
        &mut self,
        func: &FunctionEnv,
        tokens: &mut Tokens<JavaScript>,
    ) -> Result<()> {
        let transaction = &js::import("@mysten/sui/transactions", "Transaction");
        let published_at = &js::import("..", "PUBLISHED_AT");

        func.get_type_parameter_count();

        let param_field_names = self.params_to_field_names(func, true);
        let type_arg_count = func.get_type_parameter_count();

        let func_type_param_names = self.func_type_param_names(func);
        let single_param = param_field_names.len() == 1;

        let convert_reserved_if_needed = |name: &str| {
            if JS_STRICTLY_RESERVED_WORDS.contains(&name) {
                name.to_owned() + "_"
            } else {
                name.to_owned()
            }
        };

        quote_in! { *tokens =>
            export function $(FunctionsGen::fun_name(func))(
                tx: $transaction,
                $(gen_type_args_param(type_arg_count, None::<&str>, ","))
                $(match param_field_names.len() {
                    0 => (),
                    1 => $(convert_reserved_if_needed(&param_field_names[0].0)): $(self.param_type_to_field_type(&param_field_names[0].1)),
                    _ => args: $(FunctionsGen::fun_arg_if_name(func))
                })
            ) {
                return tx.moveCall({
                    target: $[str]($($published_at)::$[const](func.get_full_name_str())),
                    $(match type_arg_count {
                        0 => (),
                        1 => { typeArguments: [typeArg], },
                        _ => { typeArguments: typeArgs, },
                    })
                    arguments: [
                        $(if param_field_names.len() == 1 {
                            $(self.param_to_tx_arg(
                                param_field_names[0].1.clone(), convert_reserved_if_needed(&param_field_names[0].0),
                                func_type_param_names, single_param
                            ))
                        } else {
                            $(for (field_name, type_) in param_field_names join (, ) =>
                                $(self.param_to_tx_arg(
                                    type_, "args.".to_string() + &field_name,
                                    func_type_param_names.clone(), single_param
                                ))
                            )
                        })
                    ],
                })
            }$['\n']
        };

        Ok(())
    }
}

enum ExtendsOrWraps {
    None,
    Extends(js::Tokens),
    Wraps(js::Tokens),
}

pub struct StructsGen<'env, 'a> {
    env: &'env GlobalEnv,
    import_ctx: StructClassImportCtx<'env, 'a>,
    framework: FrameworkImportCtx,
    type_origin_table: &'env TypeOriginTable,
    version_table: &'env VersionTable,
}

impl<'env, 'a> StructsGen<'env, 'a> {
    pub fn new(
        env: &'env GlobalEnv,
        import_ctx: StructClassImportCtx<'env, 'a>,
        framework: FrameworkImportCtx,
        type_origin_table: &'env TypeOriginTable,
        version_table: &'env VersionTable,
    ) -> Self {
        StructsGen {
            env,
            import_ctx,
            framework,
            type_origin_table,
            version_table,
        }
    }

    fn get_full_name_with_address_str(&self, strct: &StructEnv) -> String {
        get_full_name_with_address_str(strct, self.type_origin_table)
    }

    fn gen_full_name_with_address(
        &self,
        strct: &StructEnv,
        open_quote: bool,
        as_type: bool,
    ) -> js::Tokens {
        gen_full_name_with_address(
            strct,
            self.type_origin_table,
            self.version_table,
            open_quote,
            as_type,
        )
    }

    fn gen_bcs_def_for_type(&mut self, ty: &Type, type_param_names: &Vec<QuoteItem>) -> js::Tokens {
        gen_bcs_def_for_type(ty, self.env, type_param_names, &mut self.import_ctx)
    }

    fn symbol_pool(&self) -> &SymbolPool {
        self.env.symbol_pool()
    }

    /// Generates a TS interface field name from a struct field.
    fn gen_field_name(&self, field: &FieldEnv) -> impl FormatInto<JavaScript> {
        let name = field
            .get_name()
            .display(self.symbol_pool())
            .to_string()
            .to_case(Case::Camel);
        quote_fn! {
            $name
        }
    }

    /// Generates a TS interface field type for a struct field. References class structs generated
    /// in other modules by importing them when needed.
    fn gen_struct_class_field_type(
        &mut self,
        strct: &StructEnv,
        ty: &Type,
        type_param_names: Vec<Symbol>,
        wrap_non_phantom_type_parameter: Option<js::Tokens>,
        wrap_phantom_type_parameter: Option<js::Tokens>,
    ) -> js::Tokens {
        self.gen_struct_class_field_type_inner(
            strct,
            ty,
            type_param_names,
            wrap_non_phantom_type_parameter,
            wrap_phantom_type_parameter,
            true,
        )
    }

    fn gen_struct_class_field_type_inner(
        &mut self,
        strct: &StructEnv,
        ty: &Type,
        type_param_names: Vec<Symbol>,
        wrap_non_phantom_type_parameter: Option<js::Tokens>,
        wrap_phantom_type_parameter: Option<js::Tokens>,
        is_top_level: bool,
    ) -> js::Tokens {
        let to_field = &self.framework.import("reified", "ToField");
        let to_phantom = &self
            .framework
            .import("reified", "ToTypeStr")
            .with_alias("ToPhantom");
        let vector = &self.framework.import("vector", "Vector");

        let field_type = match ty {
            Type::Primitive(ty) => match ty {
                PrimitiveType::U8 => quote!($[str](u8)),
                PrimitiveType::U16 => quote!($[str](u16)),
                PrimitiveType::U32 => quote!($[str](u32)),
                PrimitiveType::U64 => quote!($[str](u64)),
                PrimitiveType::U128 => quote!($[str](u128)),
                PrimitiveType::U256 => quote!($[str](u256)),
                PrimitiveType::Bool => quote!($[str](bool)),
                PrimitiveType::Address => quote!($[str](address)),
                _ => panic!("unexpected primitive type: {:?}", ty),
            },
            Type::Vector(ty) => {
                quote!($vector<$(self.gen_struct_class_field_type_inner(
                    strct, ty, type_param_names, wrap_non_phantom_type_parameter, wrap_phantom_type_parameter, false
                ))>)
            }
            Type::Datatype(mid, sid, ts) => {
                let field_module = self.env.get_module(*mid);
                todo_panic_if_enum(&field_module, sid);

                let field_strct = field_module.get_struct(*sid);
                let class = self.import_ctx.get_class(&field_strct);

                let type_param_inner_toks = (0..ts.len()).map(|idx| {
                    let wrap_to_phantom = field_strct.is_phantom_parameter(idx)
                        && match &ts[idx] {
                            Type::TypeParameter(t_idx) => {
                                !strct.is_phantom_parameter(*t_idx as usize)
                            }
                            Type::Datatype(_, _, _) | Type::Vector(_) => true,
                            _ => false,
                        };

                    let inner = self.gen_struct_class_field_type_inner(
                        strct,
                        &ts[idx],
                        type_param_names.clone(),
                        wrap_non_phantom_type_parameter.clone(),
                        wrap_phantom_type_parameter.clone(),
                        false,
                    );
                    if wrap_to_phantom {
                        quote!($to_phantom<$inner>)
                    } else {
                        quote!($inner)
                    }
                });

                quote!($class$(if !ts.is_empty() {
                    <$(for param in type_param_inner_toks join (, ) => $param)>
                }))
            }
            Type::TypeParameter(idx) => {
                let ty = type_param_names[*idx as usize]
                    .display(self.symbol_pool())
                    .to_string();

                let is_phantom = strct.is_phantom_parameter(*idx as usize);
                let wrap = if is_phantom {
                    wrap_phantom_type_parameter
                } else {
                    wrap_non_phantom_type_parameter
                };

                match wrap {
                    Some(wrap_type_parameter) => quote!($wrap_type_parameter<$ty>),
                    None => quote!($ty),
                }
            }
            _ => panic!("unexpected type: {:?}", ty),
        };

        if is_top_level {
            quote!($to_field<$field_type>)
        } else {
            quote!($field_type)
        }
    }

    /// Returns the type parameters of a struct. If the source map is available, the type parameters
    /// are named according to the source map. Otherwise, they are named `T0`, `T1`, etc.
    fn strct_type_param_names(&self, strct: &StructEnv) -> Vec<Symbol> {
        let symbol_pool = strct.module_env.env.symbol_pool();

        strct
            .get_named_type_parameters()
            .into_iter()
            .map(|param| {
                let name = param.0.display(self.symbol_pool()).to_string();

                if name.starts_with("unknown#") {
                    let name = name.replace("unknown#", "T");
                    symbol_pool.make(&name)
                } else {
                    param.0
                }
            })
            .collect()
    }

    fn strct_non_phantom_type_param_names(&self, strct: &StructEnv) -> Vec<Symbol> {
        let type_params = self.strct_type_param_names(strct);

        (0..strct.get_type_parameters().len())
            .filter_map(|idx| {
                if strct.is_phantom_parameter(idx) {
                    None
                } else {
                    Some(type_params[idx])
                }
            })
            .collect()
    }

    pub fn gen_struct_bcs_def_field_value(
        &mut self,
        ty: &Type,
        type_param_names: Vec<Symbol>,
    ) -> js::Tokens {
        let bcs = &js::import("@mysten/sui/bcs", "bcs");
        let from_hex = &js::import("@mysten/sui/utils", "fromHEX");
        let to_hex = &js::import("@mysten/sui/utils", "toHEX");
        match ty {
            Type::Primitive(ty) => match ty {
                PrimitiveType::U8 => quote!($bcs.u8()),
                PrimitiveType::U16 => quote!($bcs.u16()),
                PrimitiveType::U32 => quote!($bcs.u32()),
                PrimitiveType::U64 => quote!($bcs.u64()),
                PrimitiveType::U128 => quote!($bcs.u128()),
                PrimitiveType::U256 => quote!($bcs.u256()),
                PrimitiveType::Bool => quote!($bcs.bool()),
                PrimitiveType::Address => quote!($bcs.bytes(32).transform({
                    input: (val: string) => $from_hex(val),
                    output: (val: Uint8Array) => $to_hex(val),
                })),
                PrimitiveType::Signer => quote!($bcs.bytes(32)),
                _ => panic!("unexpected primitive type: {:?}", ty),
            },
            Type::Vector(ty) => {
                quote!($bcs.vector($(self.gen_struct_bcs_def_field_value(ty, type_param_names))))
            }
            Type::Datatype(mid, sid, ts) => {
                let field_module = self.env.get_module(*mid);
                todo_panic_if_enum(&field_module, sid);
                let field_strct = field_module.get_struct(*sid);

                let class = self.import_ctx.get_class(&field_strct);
                let non_phantom_param_idxs = (0..ts.len())
                    .filter(|idx| !field_strct.is_phantom_parameter(*idx))
                    .collect::<Vec<_>>();

                quote!($class.bcs$(if !non_phantom_param_idxs.is_empty() {
                    ($(for idx in non_phantom_param_idxs join (, ) =>
                        $(self.gen_struct_bcs_def_field_value(&ts[idx], type_param_names.clone()))
                    ))
                }))
            }
            Type::TypeParameter(idx) => {
                quote!($(type_param_names[*idx as usize].display(self.symbol_pool()).to_string()))
            }
            _ => panic!("unexpected type: {:?}", ty),
        }
    }

    pub fn gen_reified(
        &mut self,
        strct: &StructEnv,
        ty: &Type,
        type_param_names: &Vec<Tokens<JavaScript>>,
    ) -> js::Tokens {
        let reified = &self.framework.import("reified", "reified").into_wildcard();
        match ty {
            Type::Primitive(ty) => match ty {
                PrimitiveType::U8 => quote!($[str](u8)),
                PrimitiveType::U16 => quote!($[str](u16)),
                PrimitiveType::U32 => quote!($[str](u32)),
                PrimitiveType::U64 => quote!($[str](u64)),
                PrimitiveType::U128 => quote!($[str](u128)),
                PrimitiveType::U256 => quote!($[str](u256)),
                PrimitiveType::Bool => quote!($[str](bool)),
                PrimitiveType::Address => quote!($[str](address)),
                _ => panic!("unexpected primitive type: {:?}", ty),
            },
            Type::Vector(ty) => {
                quote!($reified.vector($(self.gen_reified(strct, ty, type_param_names))))
            }
            Type::Datatype(mid, sid, ts) => {
                let field_module = self.env.get_module(*mid);
                todo_panic_if_enum(&field_module, sid);
                let field_strct = field_module.get_struct(*sid);

                let class = self.import_ctx.get_class(&field_strct);

                let mut toks: Vec<js::Tokens> = vec![];
                for (idx, ty) in ts.iter().enumerate() {
                    let wrap_to_phantom = field_strct.is_phantom_parameter(idx)
                        && match &ts[idx] {
                            Type::TypeParameter(t_idx) => {
                                !strct.is_phantom_parameter(*t_idx as usize)
                            }
                            _ => true,
                        };

                    let inner = self.gen_reified(strct, ty, type_param_names);
                    let tok = if wrap_to_phantom {
                        quote!($reified.phantom($inner))
                    } else {
                        quote!($inner)
                    };
                    toks.push(tok);
                }

                quote!($class.reified($(if !ts.is_empty() {
                    $(for t in toks join (, ) => $t)
                })))
            }
            Type::TypeParameter(idx) => {
                quote!($(type_param_names[*idx as usize].clone()))
            }
            _ => panic!("unexpected type: {:?}", ty),
        }
    }

    fn gen_from_fields_field_decode(&mut self, field: &FieldEnv) -> js::Tokens {
        let decode_from_fields = &self.framework.import("reified", "decodeFromFields");

        let strct = &field.parent_env;

        match strct {
            move_model::model::EnclosingEnv::Struct(strct) => {
                let field_arg_name =
                    format!("fields.{}", field.get_name().display(self.symbol_pool()));

                let type_param_names = match strct.get_type_parameters().len() {
                    0 => vec![],
                    1 => vec![quote!(typeArg)],
                    n => (0..n).map(|idx| quote!(typeArgs[$idx])).collect::<Vec<_>>(),
                };
                let reified = self.gen_reified(strct, &field.get_type(), &type_param_names);

                quote!(
                    $decode_from_fields($(reified), $(field_arg_name))
                )
            }
            move_model::model::EnclosingEnv::Variant(_) => todo!("enums not supported yet"),
        }
    }

    fn gen_from_fields_with_types_field_decode(&mut self, field: &FieldEnv) -> js::Tokens {
        let decode_from_fields_with_types_generic_or_special = &self
            .framework
            .import("reified", "decodeFromFieldsWithTypes");

        let strct = &field.parent_env;

        let field_arg_name = format!(
            "item.fields.{}",
            field.get_name().display(self.symbol_pool())
        );

        match strct {
            move_model::model::EnclosingEnv::Struct(strct) => {
                let type_param_names = match strct.get_type_parameters().len() {
                    0 => vec![],
                    1 => vec![quote!(typeArg)],
                    n => (0..n).map(|idx| quote!(typeArgs[$idx])).collect::<Vec<_>>(),
                };
                let reified = self.gen_reified(strct, &field.get_type(), &type_param_names);

                quote!(
                    $decode_from_fields_with_types_generic_or_special($(reified), $(field_arg_name))
                )
            }
            move_model::model::EnclosingEnv::Variant(_) => todo!("enums not supported yet"),
        }
    }

    fn gen_from_json_field_field_decode(&mut self, field: &FieldEnv) -> js::Tokens {
        let decode_from_json_field = &self.framework.import("reified", "decodeFromJSONField");

        let strct = &field.parent_env;

        let field_arg_name = quote!(field.$(self.gen_field_name(field)));

        match strct {
            move_model::model::EnclosingEnv::Struct(strct) => {
                let type_param_names = match strct.get_type_parameters().len() {
                    0 => vec![],
                    1 => vec![quote!(typeArg)],
                    n => (0..n).map(|idx| quote!(typeArgs[$idx])).collect::<Vec<_>>(),
                };
                let reified = self.gen_reified(strct, &field.get_type(), &type_param_names);

                quote!(
                    $decode_from_json_field($(reified), $(field_arg_name))
                )
            }
            move_model::model::EnclosingEnv::Variant(_) => todo!(),
        }
    }

    /// Generates the `is<StructName>` function for a struct.
    pub fn gen_is_type_func(&self, tokens: &mut js::Tokens, strct: &StructEnv) {
        let compress_sui_type = &self.framework.import("util", "compressSuiType");

        let struct_name = strct.get_name().display(self.symbol_pool()).to_string();
        let type_params = self.strct_type_param_names(strct);

        quote_in! { *tokens =>
            export function is$(&struct_name)(type: string): boolean {
                type = $compress_sui_type(type);
                $(if type_params.is_empty() {
                    return type === $(self.gen_full_name_with_address(strct, true, false))
                } else {
                    return type.startsWith($(self.gen_full_name_with_address(strct, true, false)) + '<')
                });
            }
        }
        tokens.line();
    }

    /// Generates TS type param tokens for a struct. Ignores phantom type parameters as these
    /// are not used in the generated code.
    /// E.g. for `struct Foo<T, P>`, this generates `<T, P>`.
    fn gen_params_toks(
        &self,
        strct: &StructEnv,
        param_names: Vec<impl FormatInto<JavaScript>>,
        extends_or_wraps_non_phantom: &ExtendsOrWraps,
        extends_or_wraps_phantom: &ExtendsOrWraps,
    ) -> js::Tokens {
        if param_names.is_empty() {
            return quote!();
        }

        let extend_or_wrap = |idx: usize| {
            if strct.is_phantom_parameter(idx) {
                extends_or_wraps_phantom
            } else {
                extends_or_wraps_non_phantom
            }
        };

        let param_toks = param_names
            .into_iter()
            .enumerate()
            .map(|(idx, param_name)| {
                let extend_or_wrap = extend_or_wrap(idx);
                match extend_or_wrap {
                    ExtendsOrWraps::Extends(extends) => {
                        quote!($param_name extends $extends)
                    }
                    ExtendsOrWraps::Wraps(wraps) => {
                        quote!($wraps<$param_name>)
                    }
                    ExtendsOrWraps::None => {
                        quote!($param_name)
                    }
                }
            });

        quote!(<$(for param in param_toks join (, ) => $param)>)
    }

    fn fields_if_name(&self, strct: &StructEnv) -> String {
        let struct_name = strct.get_name().display(self.symbol_pool()).to_string();
        format!("{}Fields", &struct_name)
    }

    /// Generates the `<StructName>Fields` interface name including its type parameters.
    fn gen_fields_if_name_with_params(
        &self,
        strct: &StructEnv,
        extends_or_wraps_non_phantom: &ExtendsOrWraps,
        extends_or_wraps_phantom: &ExtendsOrWraps,
    ) -> js::Tokens {
        let type_params_str = self
            .strct_type_param_names(strct)
            .iter()
            .map(|param| param.display(self.symbol_pool()).to_string())
            .collect::<Vec<_>>();
        quote! { $(self.fields_if_name(strct))$(
            self.gen_params_toks(strct, type_params_str, extends_or_wraps_non_phantom, extends_or_wraps_phantom)
        ) }
    }

    /// Generates the `<StructName>Fields` interface.
    pub fn gen_fields_if(&mut self, tokens: &mut js::Tokens, strct: &StructEnv) {
        let type_argument = &self.framework.import("reified", "TypeArgument");
        let phantom_type_argument = &self.framework.import("reified", "PhantomTypeArgument");

        let extends_non_phantom = ExtendsOrWraps::Extends(quote!($type_argument));
        let extends_phantom = ExtendsOrWraps::Extends(quote!($phantom_type_argument));

        tokens.push();
        quote_in! { *tokens =>
            export interface $(self.gen_fields_if_name_with_params(strct, &extends_non_phantom, &extends_phantom)) {
                $(for field in strct.get_fields() join (; )=>
                    $(self.gen_field_name(&field)): $(
                        self.gen_struct_class_field_type(strct, &field.get_type(), self.strct_type_param_names(strct), None, None)
                    )
                )
            }
        };
        tokens.line();
    }

    fn interpolate(&self, str: String) -> js::Tokens {
        let mut toks = js::Tokens::new();
        toks.append(Item::OpenQuote(true));
        toks.append(Item::Literal(ItemStr::from(str)));
        toks.append(Item::CloseQuote);

        toks
    }

    /// Generates the struct class for a struct.
    pub fn gen_struct_class(&mut self, tokens: &mut js::Tokens, strct: &StructEnv) {
        let fields_with_types = &self.framework.import("util", "FieldsWithTypes");
        let compose_sui_type = &self.framework.import("util", "composeSuiType");
        let struct_class = &self.framework.import("reified", "StructClass");
        let field_to_json = &self.framework.import("reified", "fieldToJSON");
        let type_argument = &self.framework.import("reified", "TypeArgument");
        let phantom_type_argument = &self.framework.import("reified", "PhantomTypeArgument");
        let reified = &self.framework.import("reified", "Reified");
        let phantom_reified = &self.framework.import("reified", "PhantomReified");
        let to_type_argument = &self.framework.import("reified", "ToTypeArgument");
        let to_phantom_type_argument = &self.framework.import("reified", "ToPhantomTypeArgument");
        let to_type_str = &self.framework.import("reified", "ToTypeStr");
        let phantom_to_type_str = &self.framework.import("reified", "PhantomToTypeStr");
        let to_bcs = &self.framework.import("reified", "toBcs");
        let extract_type = &self.framework.import("reified", "extractType");
        let parse_type_name = &self.framework.import("util", "parseTypeName");
        let phantom = &self.framework.import("reified", "phantom");
        let assert_reified_type_args_match = &self
            .framework
            .import("reified", "assertReifiedTypeArgsMatch");
        let assert_fields_with_types_args_match = &self
            .framework
            .import("reified", "assertFieldsWithTypesArgsMatch");
        let sui_parsed_data = &js::import("@mysten/sui/client", "SuiParsedData");
        let sui_object_data = &js::import("@mysten/sui/client", "SuiObjectData");
        let sui_client = &js::import("@mysten/sui/client", "SuiClient");
        let bcs = &js::import("@mysten/sui/bcs", "bcs");
        let bcs_type = &js::import("@mysten/sui/bcs", "BcsType");
        let from_b64 = &js::import("@mysten/sui/utils", "fromB64");
        let compress_sui_type = &self.framework.import("util", "compressSuiType");

        strct.get_abilities().has_key();

        let struct_name = strct.get_name().display(self.symbol_pool()).to_string();
        let type_params = self.strct_type_param_names(strct);
        let type_params_str = type_params
            .iter()
            .map(|param| param.display(self.symbol_pool()).to_string())
            .collect::<Vec<_>>();
        let fields = strct.get_fields().collect::<Vec<_>>();
        let non_phantom_params = self.strct_non_phantom_type_param_names(strct);
        let non_phantom_param_strs = non_phantom_params
            .iter()
            .map(|param| param.display(self.symbol_pool()).to_string())
            .collect::<Vec<_>>();
        let non_phantom_param_idxs = (0..type_params.len())
            .filter(|idx| !strct.is_phantom_parameter(*idx))
            .collect::<Vec<_>>();

        let bcs_def_name = if non_phantom_params.is_empty() {
            quote!($[str]($[const](&struct_name)))
        } else {
            self.interpolate(format!(
                "{}<{}>",
                &struct_name,
                non_phantom_param_strs
                    .iter()
                    .map(|param| format!("${{{}.name}}", param))
                    .collect::<Vec<_>>()
                    .join(", ")
            ))
        };

        // readonly $typeArg: string
        // readonly $typeArgs: [ToTypeStr<T>, PhantomToTypeStr<P>, ...]
        let type_args_field_type: &js::Tokens = &quote!([$(for (idx, param) in type_params_str.iter().enumerate() join (, ) =>
            $(if strct.is_phantom_parameter(idx) {
                $phantom_to_type_str<$param>
            } else {
                $to_type_str<$param>
            })
        )]);

        // typeArg: T0,
        // typeArgs: [T0, T1, T2, T3, ...],
        let type_args_param_if_any: &js::Tokens = &match type_params.len() {
            0 => quote!(),
            1 => quote!(
                typeArg: $(type_params[0].display(self.symbol_pool()).to_string()),
            ),
            _ => quote!(typeArgs: [$(for idx in 0..type_params.len() join (, ) =>
                    $(&type_params[idx].display(self.symbol_pool()).to_string())
                )],),
        };

        let extends_type_argument = ExtendsOrWraps::Extends(quote!($type_argument));
        let extends_phantom_type_argument = ExtendsOrWraps::Extends(quote!($phantom_type_argument));
        let wraps_to_type_argument = ExtendsOrWraps::Wraps(quote!($to_type_argument));
        let wraps_phantom_to_type_argument =
            ExtendsOrWraps::Wraps(quote!($to_phantom_type_argument));

        // <T extends Reified<TypeArgument, any>, P extends PhantomReified<PhantomTypeArgument>>
        let params_toks_for_reified = &{
            let toks = type_params_str.iter().enumerate().map(|(idx, param)| {
                if strct.is_phantom_parameter(idx) {
                    quote!($param extends $phantom_reified<$phantom_type_argument>)
                } else {
                    quote!($param extends $reified<$type_argument, any>)
                }
            });

            if type_params_str.is_empty() {
                quote!()
            } else {
                quote!(<$(for tok in toks join (, ) => $tok)>)
            }
        };

        // <ToTypeArgument<T>, ToPhantomTypeArgument<P>>
        let params_toks_for_to_type_argument = &self.gen_params_toks(
            strct,
            type_params_str.clone(),
            &wraps_to_type_argument,
            &wraps_phantom_to_type_argument,
        );

        // `0x2::foo::Bar<${ToTypeStr<ToTypeArgument<T>>}, ${ToTypeStr<ToPhantomTypeArgument<P>>}>`
        let reified_full_type_name_as_toks = match type_params.len() {
            0 => quote!($(self.gen_full_name_with_address(strct, true, true))),
            _ => {
                let mut toks = js::Tokens::new();
                toks.append(Item::OpenQuote(true));
                quote_in!(toks => $(self.gen_full_name_with_address(strct, false, true)));
                toks.append(Item::Literal(ItemStr::from("<")));
                for (idx, param) in type_params_str.iter().enumerate() {
                    let is_phantom = strct.is_phantom_parameter(idx);

                    toks.append(Item::Literal(ItemStr::from("${")));
                    if is_phantom {
                        quote_in!(toks => $phantom_to_type_str<$to_phantom_type_argument<$param>>);
                    } else {
                        quote_in!(toks => $to_type_str<$to_type_argument<$param>>);
                    }
                    toks.append(Item::Literal(ItemStr::from("}")));

                    let is_last = idx == &type_params_str.len() - 1;
                    if !is_last {
                        toks.append(Item::Literal(ItemStr::from(", ")));
                    }
                }
                toks.append(Item::Literal(ItemStr::from(">")));
                toks.append(Item::CloseQuote);
                quote!($toks)
            }
        };

        // [PhantomToTypeStr<ToPhantomTypeArgument<T>>, ToTypeStr<ToTypeArgument<P>>, ...]
        let reified_type_args_as_toks = &quote!([$(for(idx, param) in type_params_str.iter().enumerate() join (, ) =>
            $(if strct.is_phantom_parameter(idx) {
                $phantom_to_type_str<$to_phantom_type_argument<$param>>
            } else {
                $to_type_str<$to_type_argument<$param>>
            })
        )]);

        // `0x2::foo::Bar<${ToTypeStr<T>}, ${ToTypeStr<P>}>`
        let static_full_type_name_as_toks = &match type_params.len() {
            0 => quote!($(self.gen_full_name_with_address(strct, true, true))),
            _ => {
                let mut toks = js::Tokens::new();
                toks.append(Item::OpenQuote(true));
                quote_in!(toks => $(self.gen_full_name_with_address(strct, false, true)));
                toks.append(Item::Literal(ItemStr::from("<")));
                for (idx, param) in type_params_str.iter().enumerate() {
                    toks.append(Item::Literal(ItemStr::from("${")));
                    if strct.is_phantom_parameter(idx) {
                        quote_in!(toks => $phantom_to_type_str<$param>);
                    } else {
                        quote_in!(toks => $to_type_str<$param>);
                    }
                    toks.append(Item::Literal(ItemStr::from("}")));

                    let is_last = idx == &type_params_str.len() - 1;
                    if !is_last {
                        toks.append(Item::Literal(ItemStr::from(", ")));
                    }
                }
                toks.append(Item::Literal(ItemStr::from(">")));
                toks.append(Item::CloseQuote);
                quote!($toks)
            }
        };

        // `[true, false]`
        let type_arg_is_phantom = (0..type_params.len()).map(|idx| strct.is_phantom_parameter(idx));
        let is_phantom_value_toks = &quote! {
            [$(for is_phantom in type_arg_is_phantom {
                $(if is_phantom {
                    true,
                } else {
                    false,
                })
            })]
        };

        let is_option = self.get_full_name_with_address_str(strct) == "0x1::option::Option";

        quote_in! { *tokens =>
            export type $(&struct_name)Reified$(self.gen_params_toks(
                strct, type_params_str.clone(), &extends_type_argument, &extends_phantom_type_argument
            )) = $reified<
                $(&struct_name)$(self.gen_params_toks(strct, type_params_str.clone(), &ExtendsOrWraps::None, &ExtendsOrWraps::None)),
                $(&struct_name)Fields$(self.gen_params_toks(strct, type_params_str.clone(), &ExtendsOrWraps::None, &ExtendsOrWraps::None))
            >;$['\n']
        }

        tokens.push();
        quote_in! { *tokens =>
            export class $(&struct_name)$(self.gen_params_toks(strct, type_params_str.clone(), &extends_type_argument, &extends_phantom_type_argument)) implements $struct_class {
                __StructClass = true as const;$['\n']

                static readonly $$typeName = $(self.gen_full_name_with_address(strct, true, false));
                static readonly $$numTypeParams = $(type_params.len());
                static readonly $$isPhantom = $is_phantom_value_toks as const;$['\n']

                $(if is_option {
                    __inner: $(&type_params_str[0]) = null as unknown as $(&type_params_str[0]); $(ref toks => {
                        toks.append("// for type checking in reified.ts")
                    })$['\n'];
                })

                readonly $$typeName = $(&struct_name).$$typeName;
                readonly $$fullTypeName: $static_full_type_name_as_toks;
                readonly $$typeArgs: $type_args_field_type;
                readonly $$isPhantom = $(&struct_name).$$isPhantom;$['\n']

                $(for field in strct.get_fields() join (; ) =>
                    readonly $(self.gen_field_name(&field)):
                        $(self.gen_struct_class_field_type(
                            strct, &field.get_type(), self.strct_type_param_names(strct), None, None
                        ))
                )$['\n']

                private constructor(typeArgs: $type_args_field_type, $(match fields.len() {
                        0 => (),
                        _ => { fields: $(self.gen_fields_if_name_with_params(strct, &ExtendsOrWraps::None, &ExtendsOrWraps::None)), }
                    })
                ) {
                    this.$$fullTypeName = $compose_sui_type(
                            $(&struct_name).$$typeName,
                            ...typeArgs
                    ) as $static_full_type_name_as_toks;
                    this.$$typeArgs = typeArgs;$['\n']

                    $(match fields.len() {
                        0 => (),
                        _ => {
                            $(for field in &fields join (; ) =>
                                this.$(self.gen_field_name(field)) = fields.$(self.gen_field_name(field));
                            )
                        }
                    })
                }$['\n']


                static reified$(params_toks_for_reified)(
                    $(for param in type_params_str.iter() join (, ) => $param: $param)
                ): $(&struct_name)Reified$(
                    self.gen_params_toks(strct, type_params_str.clone(), &wraps_to_type_argument, &wraps_phantom_to_type_argument)
                ) {
                    return {
                        typeName: $(&struct_name).$$typeName,
                        fullTypeName: $compose_sui_type(
                            $(&struct_name).$$typeName,
                            ...[$(for param in &type_params_str join (, ) => $extract_type($param))]
                        ) as $reified_full_type_name_as_toks,
                        typeArgs: [
                            $(for param in &type_params_str join (, ) => $extract_type($param))
                        ] as $reified_type_args_as_toks,
                        isPhantom: $(&struct_name).$$isPhantom,
                        reifiedTypeArgs: [$(for param in &type_params_str join (, ) => $param)],
                        fromFields: (fields: Record<string, any>) =>
                            $(&struct_name).fromFields(
                                $(match type_params.len() {
                                    0 => (),
                                    1 => { $(type_params_str[0].clone()), },
                                    _ => { [$(for param in &type_params_str join (, ) => $param)], },
                                })
                                fields,
                            ),
                        fromFieldsWithTypes: (item: $fields_with_types) =>
                            $(&struct_name).fromFieldsWithTypes(
                                $(match type_params.len() {
                                    0 => (),
                                    1 => { $(type_params_str[0].clone()), },
                                    _ => { [$(for param in &type_params_str join (, ) => $param)], },
                                })
                                item,
                            ),
                        fromBcs: (data: Uint8Array) =>
                            $(&struct_name).fromBcs(
                                $(match type_params.len() {
                                    0 => (),
                                    1 => { $(type_params_str[0].clone()), },
                                    _ => { [$(for param in &type_params_str join (, ) => $param)], },
                                })
                                data,
                            ),
                        bcs: $(&struct_name).bcs$(if !non_phantom_params.is_empty() {
                            ($(for param in &non_phantom_param_strs join (, ) => $to_bcs($param)))
                        }),
                        fromJSONField: (field: any) =>
                            $(&struct_name).fromJSONField(
                                $(match type_params.len() {
                                    0 => (),
                                    1 => { $(type_params_str[0].clone()), },
                                    _ => { [$(for param in &type_params_str join (, ) => $param)], },
                                })
                                field,
                            ),
                        fromJSON: (json: Record<string, any>) =>
                            $(&struct_name).fromJSON(
                                $(match type_params.len() {
                                    0 => (),
                                    1 => { $(type_params_str[0].clone()), },
                                    _ => { [$(for param in &type_params_str join (, ) => $param)], },
                                })
                                json,
                            ),
                        fromSuiParsedData: (content: $sui_parsed_data) =>
                            $(&struct_name).fromSuiParsedData(
                                $(match type_params.len() {
                                    0 => (),
                                    1 => { $(type_params_str[0].clone()), },
                                    _ => { [$(for param in &type_params_str join (, ) => $param)], },
                                })
                                content,
                            ),
                        fromSuiObjectData: (content: $sui_object_data) =>
                            $(&struct_name).fromSuiObjectData(
                                $(match type_params.len() {
                                    0 => (),
                                    1 => { $(type_params_str[0].clone()), },
                                    _ => { [$(for param in &type_params_str join (, ) => $param)], },
                                })
                                content,
                            ),
                        fetch: async (client: $sui_client, id: string) => $(&struct_name).fetch(
                            client,
                            $(match type_params.len() {
                                0 => (),
                                1 => { $(type_params_str[0].clone()), },
                                _ => { [$(for param in &type_params_str join (, ) => $param)], },
                            })
                            id,
                        ),
                        new: (
                            $(match fields.len() {
                                0 => (),
                                _ => { fields: $(self.gen_fields_if_name_with_params(strct, &wraps_to_type_argument, &wraps_phantom_to_type_argument)), }
                            })
                        ) => {
                            return new $(&struct_name)(
                                [$(for param in &type_params_str join (, ) => $extract_type($param))],
                                $(match fields.len() {
                                    0 => (),
                                    _ => fields,
                                })
                            )
                        },
                        kind: "StructClassReified",
                    }
                }$['\n']

                static get r() {
                    $(if type_params.is_empty() {
                        return $(&struct_name).reified()
                    } else {
                        return $(&struct_name).reified
                    })
                }$['\n']

                static phantom$(params_toks_for_reified)(
                    $(for param in type_params_str.iter() join (, ) => $param: $param)
                ): $phantom_reified<$to_type_str<$(&struct_name)$(params_toks_for_to_type_argument)>> {
                    return $phantom($(&struct_name).reified(
                        $(for param in type_params_str.iter() join (, ) => $param)
                    ));
                }

                static get p() {
                    $(if type_params.is_empty() {
                        return $(&struct_name).phantom()
                    } else {
                        return $(&struct_name).phantom
                    })
                }$['\n']

                static get bcs() {
                    return $(if !non_phantom_params.is_empty() {
                        <$(for param in non_phantom_param_strs.iter() join (, ) =>
                            $param extends $bcs_type<any>
                        )>($(for param in non_phantom_param_strs.iter() join (, ) =>
                            $param: $param
                        )) =>
                    }) $bcs.struct($bcs_def_name, {$['\n']
                        $(for field in strct.get_fields() join (, ) =>
                            $(field.get_name().display(self.symbol_pool()).to_string()):
                                $(self.gen_struct_bcs_def_field_value(&field.get_type(), self.strct_type_param_names(strct)))
                        )$['\n']
                    $['\n']})
                };$['\n']

                static fromFields$(params_toks_for_reified)(
                    $type_args_param_if_any fields: Record<string, any>
                ): $(&struct_name)$(params_toks_for_to_type_argument) {
                    return $(&struct_name).reified(
                        $(match type_params.len() {
                            0 => (),
                            1 => { typeArg, },
                            _ => { $(for idx in 0..type_params.len() join (, ) => typeArgs[$idx]), },
                        })
                    ).new(
                        $(match fields.len() {
                            0 => (),
                            _ => {{
                                $(for field in &fields join (, ) =>
                                    $(self.gen_field_name(field)): $(self.gen_from_fields_field_decode(field))
                                )
                            }}
                        })
                    )
                }$['\n']

                static fromFieldsWithTypes$(params_toks_for_reified)(
                    $type_args_param_if_any item: $fields_with_types
                ): $(&struct_name)$(params_toks_for_to_type_argument) {
                    if (!is$(&struct_name)(item.type)) {
                        throw new Error($[str]($[const](format!("not a {} type", &struct_name))));$['\n']
                    }
                    $(ref toks {
                        if !type_params.is_empty() {
                            let type_args_name = match type_params.len() {
                                1 => quote!([typeArg]),
                                _ => quote!(typeArgs),
                            };
                             quote_in!(*toks =>
                                $assert_fields_with_types_args_match(item, $type_args_name);
                             )
                        }
                    })$['\n']

                    return $(&struct_name).reified(
                        $(match type_params.len() {
                            0 => (),
                            1 => { typeArg, },
                            _ => { $(for idx in 0..type_params.len() join (, ) => typeArgs[$idx]), },
                        })
                    ).new(
                        $(match fields.len() {
                            0 => (),
                            _ => {{
                                $(for field in &fields join (, ) =>
                                    $(self.gen_field_name(field)): $(self.gen_from_fields_with_types_field_decode(field))
                                )
                            }}
                        })
                    )
                }$['\n']

                static fromBcs$(params_toks_for_reified)(
                    $type_args_param_if_any data: Uint8Array
                ): $(&struct_name)$(params_toks_for_to_type_argument) {
                    $(if type_params.len() == 1 && !non_phantom_params.is_empty() {
                        const typeArgs = [typeArg];$['\n']
                    })

                    return $(&struct_name).fromFields(
                        $(match type_params.len() {
                            0 => (),
                            1 => { typeArg, },
                            _ => { typeArgs, },
                        })
                        $(match non_phantom_params.len() {
                            0 => $(&struct_name).bcs.parse(data),
                            len => $(&struct_name).bcs(
                                $(for i in 0..len join (, ) => $to_bcs(typeArgs[$(non_phantom_param_idxs[i])]))
                            ).parse(data),
                        })
                    )
                }$['\n']

                toJSONField() {
                    return {$['\n']
                        $(ref toks {
                            let this_type_args = |idx: usize| quote!(this.$$typeArgs[$idx]);
                            let type_param_names = (0..strct.get_type_parameters().len())
                                .map(|idx| QuoteItem::Interpolated(this_type_args(idx)))
                                .collect::<Vec<_>>();

                            for field in fields.iter() {
                                let name = self.gen_field_name(field);
                                let this_name = quote!(this.$(self.gen_field_name(field)));

                                let field_type_param = self.gen_struct_class_field_type_inner(
                                    strct, &field.get_type(), self.strct_type_param_names(strct), None, None, false
                                );

                                match field.get_type() {
                                    Type::Datatype(mid, sid, _) => {
                                        let field_module = self.env.get_module(mid);
                                        todo_panic_if_enum(&field_module, &sid);
                                        let field_strct = field_module.get_struct(sid);

                                        // handle special types
                                        match self.get_full_name_with_address_str(&field_strct).as_ref() {
                                            "0x1::string::String" | "0x1::ascii::String" => {
                                                quote_in!(*toks => $name: $this_name,)
                                            }
                                            "0x2::url::Url" => {
                                                quote_in!(*toks => $name: $this_name,)
                                            }
                                            "0x2::object::ID" => {
                                                quote_in!(*toks => $name: $this_name,)
                                            }
                                            "0x2::object::UID" => {
                                                quote_in!(*toks => $name: $this_name, )
                                            }
                                            "0x1::option::Option" => {
                                                let type_name = self.gen_bcs_def_for_type(&field.get_type(), &type_param_names);
                                                quote_in!(*toks => $name: $field_to_json<$field_type_param>($type_name, $this_name),)
                                            }
                                            _ => {
                                                quote_in!(*toks => $name: $this_name.toJSONField(),)
                                            }
                                        }
                                    }
                                    Type::Primitive(ty) => match ty {
                                        PrimitiveType::U64 | PrimitiveType::U128 | PrimitiveType::U256 => {
                                            quote_in!(*toks => $name: $this_name.toString(),)
                                        }
                                        _ => {
                                            quote_in!(*toks => $name: $this_name,)
                                        }
                                    },
                                    Type::Vector(_) => {
                                        let type_name = self.gen_bcs_def_for_type(&field.get_type(), &type_param_names);

                                        quote_in!(*toks => $name: $field_to_json<$field_type_param>($type_name, $this_name),)
                                    }
                                    Type::TypeParameter(i) => {
                                        quote_in!(*toks => $name: $field_to_json<$field_type_param>($(this_type_args(i as usize)), $this_name),)
                                    }
                                    _ => {
                                        let name = self.gen_field_name(field);
                                        quote_in!(*toks => $name: $this_name.toJSONField(),)
                                    },

                                }
                            }
                        })
                    $['\n']}
                }$['\n']

                toJSON() {
                    return {
                        $$typeName: this.$$typeName,
                        $$typeArgs: this.$$typeArgs,
                        ...this.toJSONField()
                    }
                }$['\n']

                static fromJSONField$(params_toks_for_reified)(
                    $type_args_param_if_any field: any
                ): $(&struct_name)$(params_toks_for_to_type_argument) {
                    return $(&struct_name).reified(
                        $(match type_params.len() {
                            0 => (),
                            1 => { typeArg, },
                            _ => { $(for idx in 0..type_params.len() join (, ) => typeArgs[$idx]), },
                        })
                    ).new(
                        $(match fields.len() {
                            0 => (),
                            _ => {{
                                $(for field in &fields join (, ) =>
                                    $(self.gen_field_name(field)): $(self.gen_from_json_field_field_decode(field))
                                )
                            }}
                        })
                    )
                }$['\n']

                static fromJSON$(params_toks_for_reified)(
                    $type_args_param_if_any json: Record<string, any>
                ): $(&struct_name)$(params_toks_for_to_type_argument) {
                    if (json.$$typeName !==  $(&struct_name).$$typeName) {
                        throw new Error("not a WithTwoGenerics json object")
                    };
                    $(if !type_params.is_empty() {
                        $assert_reified_type_args_match(
                            $compose_sui_type($(&struct_name).$$typeName,
                            $(match type_params.len() {
                                1 => { $extract_type(typeArg) },
                                _ => { ...typeArgs.map($extract_type) },
                            })),
                            json.$$typeArgs,
                            $(match type_params.len() {
                                1 => { [typeArg] },
                                _ => { typeArgs },
                            }),
                        )
                    })$['\n']

                    return $(&struct_name).fromJSONField(
                        $(match type_params.len() {
                            0 => (),
                            1 => { typeArg, },
                            _ => { typeArgs, },
                        })
                        json,
                    )
                }$['\n']

                static fromSuiParsedData$(params_toks_for_reified)(
                    $type_args_param_if_any content: $sui_parsed_data
                ): $(&struct_name)$(params_toks_for_to_type_argument) {
                    if (content.dataType !== "moveObject") {
                        throw new Error("not an object");
                    }
                    if (!is$(&struct_name)(content.type)) {
                        throw new Error($(self.interpolate(
                            format!("object at ${{(content.fields as any).id}} is not a {} object", &struct_name))
                        ));
                    }
                    return $(&struct_name).fromFieldsWithTypes(
                        $(match type_params.len() {
                            0 => (),
                            1 => { typeArg, },
                            _ => { typeArgs, },
                        })
                        content
                    );
                }$['\n']

                static fromSuiObjectData$(params_toks_for_reified)(
                    $type_args_param_if_any data: $sui_object_data
                ): $(&struct_name)$(params_toks_for_to_type_argument) {
                    if (data.bcs) {
                        if (data.bcs.dataType !== "moveObject" || !is$(&struct_name)(data.bcs.type)) {
                            throw new Error($(self.interpolate(
                                format!("object at is not a {} object", &struct_name))
                            ));
                        }$['\n']
                        $(match type_params.len() {
                            0 => (),
                            1 => {
                                const gotTypeArgs = $parse_type_name(data.bcs.type).typeArgs;
                                if (gotTypeArgs.length !== 1) {
                                    throw new Error($(self.interpolate(
                                        "type argument mismatch: expected 1 type argument but got '${gotTypeArgs.length}'".to_string()
                                    )));
                                };
                                const gotTypeArg = $compress_sui_type(gotTypeArgs[0]);
                                const expectedTypeArg = $compress_sui_type($extract_type(typeArg));
                                if (gotTypeArg !== $compress_sui_type($extract_type(typeArg))) {
                                    throw new Error($(self.interpolate(
                                        "type argument mismatch: expected '${expectedTypeArg}' but got '${gotTypeArg}'".to_string()
                                    )));
                                };
                            },
                            n => {
                                const gotTypeArgs = $parse_type_name(data.bcs.type).typeArgs;
                                if (gotTypeArgs.length !== $n) {
                                    throw new Error($(self.interpolate(
                                        format!("type argument mismatch: expected {} type arguments but got ${{gotTypeArgs.length}}", n)
                                    )));
                                };
                                for (let i = 0; i < $n; i++) {
                                    const gotTypeArg = $compress_sui_type(gotTypeArgs[i]);
                                    const expectedTypeArg = $compress_sui_type($extract_type(typeArgs[i]));
                                    if (gotTypeArg !== expectedTypeArg) {
                                        throw new Error($(self.interpolate(
                                            "type argument mismatch at position ${i}: expected '${expectedTypeArg}' but got '${gotTypeArg}'".to_string()
                                        )));
                                    }
                                };
                            }
                        })$['\n']

                        return $(&struct_name).fromBcs(
                            $(match type_params.len() {
                                0 => (),
                                1 => { typeArg, },
                                _ => { typeArgs, },
                            })
                            $from_b64(data.bcs.bcsBytes)
                        );
                    }
                    if (data.content) {
                        return $(&struct_name).fromSuiParsedData(
                            $(match type_params.len() {
                                0 => (),
                                1 => { typeArg, },
                                _ => { typeArgs, },
                            })
                            data.content
                        )
                    }

                    throw new Error(
                        "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request."
                    );
                }$['\n']

                static async fetch$(params_toks_for_reified)(
                    client: $sui_client, $type_args_param_if_any id: string
                ): Promise<$(&struct_name)$(params_toks_for_to_type_argument)> {
                    const res = await client.getObject({
                        id,
                        options: {
                            showBcs: true,
                        },
                    });
                    if (res.error) {
                        throw new Error($(self.interpolate(
                            format!("error fetching {} object at id ${{id}}: ${{res.error.code}}", &struct_name))
                        ));
                    }
                    if (res.data?.bcs?.dataType !== "moveObject" || !is$(&struct_name)(res.data.bcs.type)) {
                        throw new Error($(self.interpolate(
                            format!("object at id ${{id}} is not a {} object", &struct_name))
                        ));
                    }$['\n']

                    return $(&struct_name).fromSuiObjectData(
                        $(match type_params.len() {
                            0 => (),
                            1 => { typeArg, },
                            _ => { typeArgs, },
                        })
                        res.data
                    );
                }$['\n']
            }
        }
        tokens.line()
    }

    pub fn gen_struct_sep_comment(&self, tokens: &mut js::Tokens, strct: &StructEnv) {
        let struct_name = strct.get_name().display(self.symbol_pool()).to_string();
        tokens.line();
        tokens.append(format!(
            "/* ============================== {} =============================== */",
            struct_name
        ));
        tokens.line()
    }
}

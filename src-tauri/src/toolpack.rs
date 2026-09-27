use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::Path;

use crate::runner::Step;

/// A command that reads bare arguments. Cobra never advertises this, so it has to be
/// curated per tool: `<exe> somecmd extra` silently works on 5 goalign commands and is
/// silently ignored on the other 71.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PositionalSpec {
    pub label: String,
    #[serde(default)]
    pub label_zh: Option<String>,
    pub help: String,
    #[serde(default)]
    pub help_zh: Option<String>,
    #[serde(default)]
    pub minimum: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Template {
    pub name: String,
    #[serde(default)]
    pub name_zh: Option<String>,
    pub description: String,
    #[serde(default)]
    pub description_zh: Option<String>,
    pub steps: Vec<Step>,
    /// Command ids that end the chain by consuming the alignment instead of passing it on.
    #[serde(default)]
    pub terminal: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolPack {
    pub display_name: String,
    #[serde(default)]
    pub positional: BTreeMap<String, PositionalSpec>,
    #[serde(default)]
    pub templates: Vec<Template>,
}

impl Default for ToolPack {
    fn default() -> Self {
        Self {
            display_name: String::new(),
            positional: BTreeMap::new(),
            templates: Vec::new(),
        }
    }
}

const GOALIGN: &str = include_str!("../toolpacks/goalign.json");

/// Picks the pack by matching the binary's file name. Unknown binaries still work --
/// they just get no presets and no positional-argument hints.
pub fn pack_for(binary: &Path) -> ToolPack {
    let stem = binary
        .file_stem()
        .map(|s| s.to_string_lossy().to_lowercase())
        .unwrap_or_default();
    let mut pack: ToolPack = if stem.starts_with("goalign") {
        serde_json::from_str(GOALIGN).unwrap_or_default()
    } else {
        ToolPack::default()
    };
    if pack.display_name.is_empty() {
        pack.display_name = stem;
    }
    pack
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The shipped pack has to survive the round trip through serde, and its command ids
    /// have to be the ones the real CLI uses.
    #[test]
    fn bundled_pack_parses() {
        let pack: ToolPack = serde_json::from_str(GOALIGN).expect("goalign.json is valid");
        assert_eq!(pack.display_name, "GoAlign");
        assert!(!pack.templates.is_empty());
        for id in ["append", "concat", "revcomp", "subset", "subsites"] {
            assert!(pack.positional.contains_key(id), "missing positional spec: {id}");
        }
        assert!(pack
            .templates
            .iter()
            .all(|t| t.steps.iter().all(|s| !s.command.is_empty())));
    }

    #[test]
    fn unknown_binary_gets_an_empty_pack() {
        let pack = pack_for(Path::new("C:\\tools\\mycli.exe"));
        assert_eq!(pack.display_name, "mycli");
        assert!(pack.templates.is_empty());
        assert!(pack.positional.is_empty());
    }
}

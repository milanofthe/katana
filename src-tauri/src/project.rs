// Project file IO. The timeline serializes to a small JSON document (.katana);
// these commands just read/write the text. Derived media (thumbnails, waveforms,
// asset URLs) is regenerated on load, so files stay tiny.

#[tauri::command]
pub fn save_project(path: String, contents: String) -> Result<(), String> {
	std::fs::write(&path, contents).map_err(|e| format!("Could not save project: {e}"))
}

#[tauri::command]
pub fn load_project(path: String) -> Result<String, String> {
	std::fs::read_to_string(&path).map_err(|e| format!("Could not open project: {e}"))
}

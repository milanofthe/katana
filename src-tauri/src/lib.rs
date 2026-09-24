mod export;
mod media;
mod project;

/// Windows keeps child processes alive when their parent dies. Put Katana in a
/// job that kills every member once its last handle closes (on exit or crash),
/// so ffmpeg/ffprobe sidecars never outlive the app. Children join on spawn.
#[cfg(windows)]
fn kill_children_with_app() {
  use windows_sys::Win32::System::JobObjects::*;
  use windows_sys::Win32::System::Threading::GetCurrentProcess;
  unsafe {
    let job = CreateJobObjectW(std::ptr::null(), std::ptr::null());
    if job.is_null() {
      return;
    }
    let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = std::mem::zeroed();
    info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
    SetInformationJobObject(
      job,
      JobObjectExtendedLimitInformation,
      &info as *const _ as *const _,
      std::mem::size_of_val(&info) as u32,
    );
    // The handle is deliberately never closed: it lives as long as the process.
    AssignProcessToJobObject(job, GetCurrentProcess());
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  #[cfg(windows)]
  kill_children_with_app();

  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![
      export::export_video,
      export::probe_fps,
      media::extract_thumbnails,
      media::extract_audio,
      project::save_project,
      project::load_project
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

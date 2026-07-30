export function handleAuthError(router: any) {
  localStorage.removeItem("attendance_session_token");
  localStorage.removeItem("attendance_session_role");
  localStorage.removeItem("attendance_full_name");
  document.cookie = "attendance_session_token=; Max-Age=0; path=/;";
  document.cookie = "attendance_session_role=; Max-Age=0; path=/;";
  router.push('/login');
}

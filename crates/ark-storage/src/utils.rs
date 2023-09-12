pub fn format_token_id(token_id: String) -> String {
  format!("{:0>width$}", token_id, width = 78)
}
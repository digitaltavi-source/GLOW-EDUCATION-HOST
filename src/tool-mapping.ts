export function mapSubmitWorkInput(
  mission_id: string,
  work_token: string,
  result: Record<string, unknown>
) {
  return { mission_id, work_token, work_result: result };
}

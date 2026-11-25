/* Supabase 공개 브라우저 설정. url/key가 비어 있으면 이 기기 기록을 사용합니다.
 * key에는 publishable 키 또는 anon 키만 넣으세요.
 *
 * 제출 RPC 인수: p_nickname text, p_best_score integer,
 * p_cleared_stages integer, p_best_combo integer.
 * 조회 RPC는 인수 없이 호출하며 행은 nickname, best_score, cleared_stages, best_combo를 반환합니다.
 * 서버는 moa_blaster_* 전용 테이블을 사용하고 점수·별명 검증과 공개 권한을 서버에서 제한해야 합니다.
 */
window.BLASTER_BOARD = Object.freeze({
  url: '',
  key: '',
  submit: 'moa_blaster_submit',
  board: 'moa_blaster_leaderboard'
});

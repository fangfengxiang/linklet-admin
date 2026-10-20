// 访问权限占位 —— 为后续登录会话 change 预留。
// Access placeholder — reserved for the future login/session change.
// 当前 allow-all；登录 change 在此注入操作员身份与权限矩阵。

export default function access(initialState: { currentUser?: unknown } = {}) {
  const { currentUser } = initialState;
  return {
    canManage: () => true, // placeholder：登录后改为基于角色的判断
    isAuthed: () => Boolean(currentUser) || true,
  };
}

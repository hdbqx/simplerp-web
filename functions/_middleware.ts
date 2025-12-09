interface Env {
  AUTH_USER: string;
  AUTH_PASS: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  // 1. 获取环境变量中的账号密码
  // 如果没有设置环境变量，为了防止死锁，默认不拦截（或者你可以改为默认拒绝）
  const validUser = context.env.AUTH_USER;
  const validPass = context.env.AUTH_PASS;

  if (!validUser || !validPass) {
    // 未配置密码时，直接放行 (或者你可以选择返回 500 提示配置)
    return await context.next();
  }

  // 2. 获取请求头中的 Authorization
  const authHeader = context.request.headers.get("Authorization");

  // 3. 检查是否包含 Basic 认证信息
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return new Response("需要登录", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="SimpleRP Admin"' },
    });
  }

  // 4. 解码并比对
  const base64Credentials = authHeader.split(" ")[1];
  const credentials = atob(base64Credentials); // 解码 Base64
  const [username, password] = credentials.split(":");

  if (username === validUser && password === validPass) {
    // 密码正确，放行
    return await context.next();
  } else {
    // 密码错误
    return new Response("账号或密码错误", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="SimpleRP Admin"' },
    });
  }
};
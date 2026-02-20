export function authStub(req, _res, next) {
  // Si le front envoie x-user-id, on l’utilise. Sinon démo.
  const userId = req.header("x-user-id") || "demo-user";
  req.user = { id: userId };
  next();
}
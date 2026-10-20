import jwt from "jsonwebtoken";

export function createToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set to a unique secret of at least 32 characters.");
  }
  return jwt.sign({ sub: user.id }, secret, { expiresIn: "2h" });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Please sign in to continue." });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Session expired. Please sign in again." });
  }
}

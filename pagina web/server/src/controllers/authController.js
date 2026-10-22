import { config } from '../config/env.js';
import { AuthService } from '../services/authService.js';
import { UserService } from '../services/userService.js';
import { validate } from '../validators/validate.js';
import { registerSchema, loginSchema, profileSchema } from '../validators/schemas.js';

const cookieOptions = () => ({
  httpOnly: true,
  secure: config.isProd,
  sameSite: config.cookieSameSite,
  maxAge: config.cookieMaxAgeMs,
  path: '/'
});

function startSession(res, user) {
  res.cookie(config.cookieName, AuthService.signToken(user), cookieOptions());
}

export const AuthController = {
  async register(req, res) {
    const data = validate(registerSchema, req.body);
    const user = await AuthService.register(data);
    startSession(res, user);
    res.status(201).json({ user, message: 'Cuenta creada correctamente' });
  },

  async login(req, res) {
    const data = validate(loginSchema, req.body);
    const user = await AuthService.login(data);
    startSession(res, user);
    res.json({ user, message: `Bienvenido, ${user.name}` });
  },

  logout(req, res) {
    const { maxAge, ...opts } = cookieOptions();
    res.clearCookie(config.cookieName, opts);
    res.json({ message: 'Sesión cerrada' });
  },

  me(req, res) {
    res.json({ user: req.user });
  },

  async updateMe(req, res) {
    const data = validate(profileSchema, req.body);
    const user = await UserService.updateProfile(req.user.id, data);
    res.json({ user, message: 'Perfil actualizado' });
  }
};

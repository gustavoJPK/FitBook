import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { UserModel } from '../models/userModel.js';
import { AppError } from '../utils/AppError.js';

// Hash ficticio para igualar el tiempo de respuesta cuando el correo no existe (evita enumeración por tiempo).
let dummyHash = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync('dummy-password-0', config.isTest ? 4 : config.bcryptRounds));

export const AuthService = {
  async register({ name, email, password, phone }) {
    if (await UserModel.emailExists(email)) {
      throw AppError.conflict('Este correo ya está registrado', { email: 'Este correo ya está registrado' });
    }
    const passwordHash = await bcrypt.hash(password, config.isTest ? 4 : config.bcryptRounds);
    try {
      return await UserModel.create({ name, email, passwordHash, phone });
    } catch (err) {
      if (err.code === '23505') throw AppError.conflict('Este correo ya está registrado');
      throw err;
    }
  },

  async login({ email, password }) {
    const user = await UserModel.findByEmailWithHash(email);
    const ok = await bcrypt.compare(password, user ? user.password_hash : getDummyHash());
    if (!user || !ok) throw AppError.unauthorized('Correo o contraseña incorrectos');
    delete user.password_hash;
    return user;
  },

  signToken(user) {
    return jwt.sign({ sub: String(user.id), role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  },

  verifyToken(token) {
    return jwt.verify(token, config.jwtSecret);
  }
};

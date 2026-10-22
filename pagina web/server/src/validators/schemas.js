export const CATEGORIES = ['yoga', 'spinning', 'crossfit', 'pilates', 'funcional', 'boxeo', 'baile'];
export const LEVELS = ['principiante', 'intermedio', 'avanzado'];
export const CLASS_STATUS = ['activa', 'cancelada'];
export const ROLES = ['user', 'admin'];

export const registerSchema = {
  name: { type: 'string', required: true, min: 2, max: 80, label: 'El nombre' },
  email: { type: 'email', required: true, label: 'El correo' },
  password: { type: 'password', required: true, label: 'La contraseña' },
  phone: { type: 'string', max: 20, pattern: /^[0-9+\-\s()]{7,20}$/, patternMsg: 'Teléfono inválido' }
};

export const loginSchema = {
  email: { type: 'email', required: true, label: 'El correo' },
  password: { type: 'string', required: true, max: 72, label: 'La contraseña' }
};

export const profileSchema = {
  name: { type: 'string', required: true, min: 2, max: 80, label: 'El nombre' },
  phone: { type: 'string', max: 20, pattern: /^[0-9+\-\s()]{7,20}$/, patternMsg: 'Teléfono inválido' }
};

export const classSchema = {
  title: { type: 'string', required: true, min: 3, max: 100, label: 'El título' },
  description: { type: 'string', required: true, min: 10, max: 1000, label: 'La descripción' },
  category: { type: 'enum', required: true, values: CATEGORIES, label: 'La categoría' },
  level: { type: 'enum', required: true, values: LEVELS, label: 'El nivel' },
  instructor: { type: 'string', required: true, min: 2, max: 80, label: 'El instructor' },
  starts_at: { type: 'date', required: true, label: 'La fecha' },
  duration_min: { type: 'int', required: true, min: 15, max: 240, label: 'La duración' },
  capacity: { type: 'int', required: true, min: 1, max: 100, label: 'El cupo' },
  price: { type: 'number', required: true, min: 0, max: 99999, label: 'El precio' },
  status: { type: 'enum', values: CLASS_STATUS, default: 'activa' }
};

export const roleSchema = {
  role: { type: 'enum', required: true, values: ROLES, label: 'El rol' }
};

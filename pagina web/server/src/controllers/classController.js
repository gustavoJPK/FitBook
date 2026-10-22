import { ClassService } from '../services/classService.js';
import { validate, parseId } from '../validators/validate.js';
import { classSchema } from '../validators/schemas.js';

export const ClassController = {
  async list(req, res) {
    res.json(await ClassService.list(req.query, req.user));
  },

  async get(req, res) {
    res.json({ item: await ClassService.get(parseId(req.params.id), req.user) });
  },

  async create(req, res) {
    const data = validate(classSchema, req.body);
    const item = await ClassService.create(data, req.user.id);
    res.status(201).json({ item, message: 'Clase creada correctamente' });
  },

  async update(req, res) {
    const id = parseId(req.params.id);
    const data = validate(classSchema, req.body);
    const item = await ClassService.update(id, data);
    res.json({ item, message: 'Clase actualizada correctamente' });
  },

  async remove(req, res) {
    await ClassService.remove(parseId(req.params.id));
    res.json({ message: 'Clase eliminada correctamente' });
  },

  async attendees(req, res) {
    res.json({ items: await ClassService.attendees(parseId(req.params.id)) });
  }
};

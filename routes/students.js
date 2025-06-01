import express from 'express';
import { setStudent, getStudentByUserId } from '../controllers/students.js';

const router = express.Router();

router.post('/setStudent', setStudent); 
router.get('/:idUser', getStudentByUserId);

export default router;
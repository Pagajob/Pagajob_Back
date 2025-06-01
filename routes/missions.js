import express from 'express';
import { setMissions, getMissions, deleteMissions, modifyMissions, getMissionById, getMissionFiles, updateMissionStatus, validateMissionCompany, validateMissionStudent, initiateMissionPayment, payMission, refundMission } from '../controllers/missions.js';

const router = express.Router();

router.post('/setMissions', setMissions); 
router.get('/getMissions', getMissions); 
router.get("/missions/:id", getMissionById);
router.delete('/deleteMissions/:id', deleteMissions);
router.put('/modifyMissions/:id', modifyMissions);
router.get('/missions/:id/files', getMissionFiles);
router.patch('/updateStatus', updateMissionStatus);
router.post('/validateCompany', validateMissionCompany);
router.post('/validateStudent', validateMissionStudent);
router.post('/initiate-payment', initiateMissionPayment);
router.post('/pay-mission/:id', payMission);
router.post('/refund/:id', refundMission);


export default router;
import express from 'express';
import { getApplicationStatus, countApplicationsThisMonth, applyToMission, getCompanyApplications, updateApplicationStatus, getStudentApplications, getApplicationsByMission } from '../controllers/applications.js';

const router = express.Router();

router.get('/getApplicationStatus', getApplicationStatus);
router.get('/countApplicationsThisMonth', countApplicationsThisMonth);
router.post('/apply', applyToMission);
router.get('/company', getCompanyApplications);
router.patch('/updateStatus', updateApplicationStatus);
router.get('/student', getStudentApplications);
router.get('/byMission/:missionId', getApplicationsByMission);


export default router;
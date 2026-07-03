const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
const Interview = require('../models/Interview');
const Employee = require('../models/Employee');
const verifyToken = require('../middleware/auth');
const checkPermission = require('../middleware/rbac');

const recruitmentProtector = checkPermission('manage_recruitment');

// --- ENSURE UPLOAD DIRECTORY EXISTS ---
const uploadDir = 'uploads/resumes/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true
  });
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});
const upload = multer({
  storage: storage
});

// ==========================================
// 📊 HIRING ANALYTICS & FUNNEL GENERATOR
// ==========================================
router.get('/analytics', verifyToken, recruitmentProtector, async (req, res) => {
  try {
    const totalJobs = await Job.countDocuments({ status: 'Open', company: req.user.company });
    const funnel = await Candidate.aggregate([
      { $match: { company: new mongoose.Types.ObjectId(req.user.company) } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    const funnelStats = { Applied: 0, Shortlisted: 0, Interviewing: 0, Offered: 0, Hired: 0, Rejected: 0 };
    funnel.forEach(item => { if (funnelStats[item._id] !== undefined) funnelStats[item._id] = item.count; });
    
    const hiredCandidates = await Candidate.find({ company: req.user.company, status: 'Hired' }).lean();
    let totalDaysToHire = 0;
    hiredCandidates.forEach(cand => {
      const diffTime = Math.abs(cand.updatedAt - cand.createdAt);
      totalDaysToHire += Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    });
    
    let avgTimeToHire = hiredCandidates.length > 0 ? Math.ceil(totalDaysToHire / hiredCandidates.length) : 14;
    let costPerHire = hiredCandidates.length > 0 ? Math.ceil(totalJobs * 5000 / hiredCandidates.length) : 4500;
    
    const settings = await CompanySettings.findOne({ company: req.user.company });
    if (settings && settings.recruitmentSettings) {
       if (settings.recruitmentSettings.manualTimeToHire > 0) avgTimeToHire = settings.recruitmentSettings.manualTimeToHire;
       if (settings.recruitmentSettings.manualCostPerHire > 0) costPerHire = settings.recruitmentSettings.manualCostPerHire;
    }

    res.status(200).json({ totalJobs, funnelStats, avgTimeToHire, costPerHire });
  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ message: "Error compiling hiring analytics parameters." });
  }
});

router.post('/analytics/config', verifyToken, recruitmentProtector, async (req, res) => {
  try {
    const { timeToHire, costPerHire } = req.body;
    let settings = await CompanySettings.findOne({ company: req.user.company });
    if (!settings) return res.status(404).json({ message: "Settings not found" });
    
    if (!settings.recruitmentSettings) settings.recruitmentSettings = {};
    settings.recruitmentSettings.manualTimeToHire = Number(timeToHire) || 0;
    settings.recruitmentSettings.manualCostPerHire = Number(costPerHire) || 0;
    
    await settings.save();
    res.status(200).json({ message: "Analytics config updated" });
  } catch(err) {
    res.status(500).json({ message: "Error updating config" });
  }
});

// ==========================================
// 🎯 JOBS POSTING MANAGEMENT
// ==========================================
router.get('/jobs', verifyToken, async (req, res) => {
  try {
    const jobs = await Job.find({
      company: req.user.company
    }).sort({
      createdAt: -1
    });
    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({
      message: "Error retrieving job posts."
    });
  }
});
const CompanySettings = require('../models/CompanySettings');

// Helper to simulate publishing a job to external boards
async function publishJobToBoards(job) {
  const postingStatus = [];
  const settings = await CompanySettings.findOne();
  if (!settings || !settings.jobBoards) {
    return [{
      board: "All",
      status: "Failed",
      message: "Company Settings not configured. Ask Admin for key to complete the connection with exterior things."
    }];
  }
  const boards = job.postedTo || [];
  for (const boardName of boards) {
    const boardConfig = settings.jobBoards.find(b => b.name === boardName);
    if (!boardConfig || !boardConfig.isConnected || !boardConfig.apiKey) {
      postingStatus.push({
        board: boardName,
        status: "Failed",
        message: `Connection failed. Ask Admin for key to complete the connection with exterior things.`
      });
    } else {
      // Simulated successful post to external API
      postingStatus.push({
        board: boardName,
        status: "Success",
        message: `Posted successfully to ${boardName}.`
      });
    }
  }
  return postingStatus;
}

// ==========================================
// 🎯 JOBS POSTING MANAGEMENT
// ==========================================
router.get('/jobs', verifyToken, recruitmentProtector, async (req, res) => {
  try {
    const jobs = await Job.find({
      company: req.user.company
    }).sort({
      createdAt: -1
    });
    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({
      message: "Error retrieving job posts."
    });
  }
});
router.post('/jobs', verifyToken, recruitmentProtector, async (req, res) => {
  try {
    const newJob = new Job({
      ...req.body,
      company: req.user.company,
      createdBy: req.user.id
    });
    await newJob.save();
    const postingStatus = await publishJobToBoards(newJob);
    res.status(201).json({
      job: newJob,
      postingStatus
    });
  } catch (error) {
    res.status(500).json({
      message: "Error committing fresh job post entry."
    });
  }
});
router.put('/jobs/:id', verifyToken, recruitmentProtector, async (req, res) => {
  try {
    const updatedJob = await Job.findOneAndUpdate({ _id: req.params.id, company: req.user.company }, req.body, {
      new: true
    });
    if (!updatedJob) return res.status(404).json({ message: "Job not found or access denied." });
    const postingStatus = await publishJobToBoards(updatedJob);
    res.status(200).json({
      job: updatedJob,
      postingStatus
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating job."
    });
  }
});
router.post('/jobs/:id/publish', verifyToken, recruitmentProtector, async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, company: req.user.company });
    if (!job) return res.status(404).json({
      message: "Job not found."
    });
    const postingStatus = await publishJobToBoards(job);
    res.status(200).json({
      message: "Publish process executed",
      postingStatus
    });
  } catch (error) {
    res.status(500).json({
      message: "Error executing job publishing simulation."
    });
  }
});
router.delete('/jobs/:id', verifyToken, recruitmentProtector, async (req, res) => {
  try {
    const deletedJob = await Job.findOneAndDelete({ _id: req.params.id, company: req.user.company });
    if (!deletedJob) return res.status(404).json({ message: "Job not found or access denied." });
    res.status(200).json({
      message: "Job deleted successfully."
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting job."
    });
  }
});

// ==========================================
// 👥 CANDIDATE MANAGEMENT
// ==========================================
router.get('/candidates', verifyToken, recruitmentProtector, async (req, res) => {
  try {
    const candidates = await Candidate.find({
      company: req.user.company
    }).populate('jobId', 'title location').sort({
      createdAt: -1
    });
    res.status(200).json(candidates);
  } catch (error) {
    res.status(500).json({
      message: "Error retrieving candidate pipelines arrays."
    });
  }
});
router.post('/candidates', verifyToken, recruitmentProtector, upload.single('resume'), async (req, res) => {
  try {
    const {
      jobId,
      name,
      email,
      phone
    } = req.body;
    const resumeUrl = req.file ? `/uploads/resumes/${req.file.filename}` : null;
    const newCandidate = new Candidate({
      company: req.user.company,
      jobId,
      name,
      email,
      phone,
      resumeUrl
    });
    await newCandidate.save();
    res.status(201).json(newCandidate);
  } catch (error) {
    res.status(500).json({
      message: "Error binding fresh candidate profiles parameters."
    });
  }
});
router.patch('/candidates/:id/status', verifyToken, recruitmentProtector, async (req, res) => {
  try {
    const {
      status
    } = req.body;
    const candidate = await Candidate.findOneAndUpdate({ _id: req.params.id, company: req.user.company }, {
      status
    }, {
      returnDocument: 'after'
    } // ✅ Correct modern syntax
    );
    res.status(200).json(candidate);
  } catch (error) {
    res.status(500).json({
      message: "Error executing profile pipeline phase modifications."
    });
  }
});

// ==========================================
// 🤖 AI SHORTLISTING INTEGRATION
// ==========================================
const axios = require('axios');
const pdfParse = require('pdf-parse');

// Helper to compute local cosine similarity as a fallback when AI service is offline
function getFallbackSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  
  const tokenize = (text) => {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  };

  const words1 = tokenize(text1);
  const words2 = tokenize(text2);
  
  if (words1.length === 0 || words2.length === 0) return 0;

  const freq1 = {};
  const freq2 = {};
  const allWords = new Set();

  words1.forEach(w => { freq1[w] = (freq1[w] || 0) + 1; allWords.add(w); });
  words2.forEach(w => { freq2[w] = (freq2[w] || 0) + 1; allWords.add(w); });

  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  allWords.forEach(w => {
    const val1 = freq1[w] || 0;
    const val2 = freq2[w] || 0;
    dotProduct += val1 * val2;
    magnitude1 += val1 * val1;
    magnitude2 += val2 * val2;
  });

  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
}

router.post('/candidates/ai-shortlist', verifyToken, recruitmentProtector, async (req, res) => {
  try {
    const appliedCandidates = await Candidate.find({
      company: req.user.company,
      status: 'Applied'
    }).populate('jobId');

    if (appliedCandidates.length === 0) {
      return res.status(200).json({ message: "No candidates to shortlist", shortlistedCount: 0 });
    }

    let shortlistedCount = 0;

    for (const cand of appliedCandidates) {
      let resumeText = "";
      if (cand.resumeUrl) {
        const filePath = path.join(__dirname, '..', cand.resumeUrl);
        if (fs.existsSync(filePath)) {
          try {
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            resumeText = pdfData.text;
          } catch(err) {
            console.warn(`Failed to parse PDF for candidate ${cand._id}:`, err.message);
          }
        }
      }
      
      const jobDesc = cand.jobId?.description || "Software Engineer role";
      
      // Attempt to call the Python AI Service. If offline, catch error and fallback to JS local similarity logic.
      let aiResponse;
      try {
        aiResponse = await axios.post('http://127.0.0.1:8000/match', {
          job_description: jobDesc,
          resumes: [resumeText]
        }, { timeout: 8000 });
      } catch (err) {
        console.warn(`AI Service (FastAPI) connection refused or timed out (${err.message}). Using javascript fallback similarity algorithm.`);
        const score = getFallbackSimilarity(jobDesc, resumeText);
        aiResponse = {
          data: {
            matches: [
              {
                score: score
              }
            ]
          }
        };
      }
      
      let isShortlisted = false;
      let finalScore = 0;
      if (aiResponse.data && aiResponse.data.matches && aiResponse.data.matches.length > 0) {
         finalScore = aiResponse.data.matches[0].score;
         // The user requested a 25% threshold. Using >= 0.25 so candidates with > 25% match are shortlisted.
         if (finalScore >= 0.25) {
            isShortlisted = true;
         }
      }

      cand.aiScore = finalScore;
      if (isShortlisted) {
        cand.status = 'Shortlisted';
        await cand.save();
        shortlistedCount++;
      } else {
        cand.status = 'Rejected';
        await cand.save();
      }
    }

    res.status(200).json({ message: "AI Shortlisting Complete", shortlistedCount });
  } catch (error) {
    console.error("AI Shortlist Route Error:", error);
    res.status(500).json({ message: "Error executing AI auto-shortlist." });
  }
});

// ==========================================
// 📅 INTERVIEW MANAGEMENT & FEEDBACK
// ==========================================
router.get('/interviews', verifyToken, recruitmentProtector, async (req, res) => {
  try {
    const interviews = await Interview.find({
      company: req.user.company
    }).populate('candidateId', 'name email status').populate('jobId', 'title').populate('interviewerId', 'name department').sort({
      scheduledDate: 1
    });
    res.status(200).json(interviews);
  } catch (error) {
    res.status(500).json({
      message: "Error mapping active schedule matrix objects."
    });
  }
});
router.post('/interviews', verifyToken, recruitmentProtector, async (req, res) => {
  try {
    const {
      candidateId,
      jobId,
      interviewerId,
      round,
      interviewType,
      scheduledDate,
      mode,
      meetingLink
    } = req.body;
    const newInterview = new Interview({
      company: req.user.company,
      candidateId,
      jobId,
      interviewerId,
      round,
      interviewType,
      scheduledDate,
      mode,
      meetingLink
    });
    await newInterview.save();
    await Candidate.findOneAndUpdate({ _id: candidateId, company: req.user.company }, {
      status: 'Interviewing'
    });
    res.status(201).json(newInterview);
  } catch (error) {
    res.status(500).json({
      message: "Error instantiating interview appointment configurations."
    });
  }
});

// UPDATED: Now handles updating Candidate Verdict directly from the Interview Action
router.patch('/interviews/:id/action', verifyToken, recruitmentProtector, async (req, res) => {
  try {
    const {
      status,
      feedback,
      candidateVerdict,
      candidateId
    } = req.body;

    // 1. Update the Interview record
    const updatedInterview = await Interview.findOneAndUpdate({ _id: req.params.id, company: req.user.company }, {
      $set: {
        status,
        feedback
      }
    }, {
      new: true
    });

    // 2. If a Candidate Verdict was provided, update the Candidate record simultaneously
    if (candidateVerdict && candidateId) {
      await Candidate.findOneAndUpdate({ _id: candidateId, company: req.user.company }, {
        status: candidateVerdict
      });
    }
    res.status(200).json(updatedInterview);
  } catch (error) {
    res.status(500).json({
      message: "Error writing feedback parameter blocks to interview columns."
    });
  }
});
router.get('/interviewers', verifyToken, recruitmentProtector, async (req, res) => {
  try {
    const employees = await Employee.find({
      company: req.user.company,
      status: {
        $ne: 'Archived'
      }
    }).select('name department role');
    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({
      message: "Failed to gather staff directory listings elements."
    });
  }
});

// GET interviews for a specific candidate
router.get('/interviews/candidate/:candidateId', verifyToken, recruitmentProtector, async (req, res) => {
  try {
    const interviews = await Interview.find({
      company: req.user.company,
      candidateId: req.params.candidateId
    }).populate('interviewerId', 'name department').sort({
      scheduledDate: 1
    });
    res.status(200).json(interviews);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching candidate interviews."
    });
  }
});

// PUT update interview (add feedback, rating, result)
router.put('/interviews/:id', verifyToken, recruitmentProtector, async (req, res) => {
  try {
    const {
      feedback,
      rating,
      result,
      status
    } = req.body;
    const updated = await Interview.findOneAndUpdate({ _id: req.params.id, company: req.user.company }, {
      $set: {
        feedback,
        rating,
        status: status || 'Completed',
        ...(result ? {
          result
        } : {})
      }
    }, {
      new: true
    });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({
      message: "Error updating interview record."
    });
  }
});

// ==========================================
// ✅ ONBOARDING CHECKLIST
// ==========================================
const DEFAULT_CHECKLIST = ['Send welcome email', 'Create system accounts', 'Assign laptop/equipment', 'Schedule orientation', 'Complete documentation', 'Team introduction', 'Assign buddy/mentor', 'Set up workstation', 'Share company handbook', 'Complete compliance training'];

// POST create onboarding checklist for hired candidate
router.post('/onboarding/:candidateId', verifyToken, recruitmentProtector, async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ _id: req.params.candidateId, company: req.user.company });
    if (!candidate) return res.status(404).json({
      message: "Candidate not found."
    });
    if (candidate.onboardingChecklist && candidate.onboardingChecklist.length > 0) {
      return res.status(200).json(candidate); // Already initialized
    }
    candidate.onboardingChecklist = DEFAULT_CHECKLIST.map(item => ({
      item,
      completed: false
    }));
    await candidate.save();
    res.status(201).json(candidate);
  } catch (error) {
    res.status(500).json({
      message: "Error creating onboarding checklist."
    });
  }
});

// GET onboarding checklist for a candidate
router.get('/onboarding/:candidateId', verifyToken, recruitmentProtector, async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ _id: req.params.candidateId, company: req.user.company }).select('name onboardingChecklist jobId');
    if (!candidate) return res.status(404).json({
      message: "Candidate not found."
    });
    res.status(200).json(candidate);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching onboarding checklist."
    });
  }
});

// PUT toggle checklist item
router.put('/onboarding/:candidateId/item/:itemIndex', verifyToken, recruitmentProtector, async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ _id: req.params.candidateId, company: req.user.company });
    if (!candidate) return res.status(404).json({
      message: "Candidate not found."
    });
    const idx = parseInt(req.params.itemIndex);
    if (idx < 0 || idx >= candidate.onboardingChecklist.length) {
      return res.status(400).json({
        message: "Invalid item index."
      });
    }
    candidate.onboardingChecklist[idx].completed = !candidate.onboardingChecklist[idx].completed;
    candidate.onboardingChecklist[idx].completedAt = candidate.onboardingChecklist[idx].completed ? new Date() : null;
    await candidate.save();
    res.status(200).json(candidate);
  } catch (error) {
    res.status(500).json({
      message: "Error toggling checklist item."
    });
  }
});
module.exports = router;
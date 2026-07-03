const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const Admin = require('../models/Admin');
const auth = require('../middleware/auth');
const planDurationMap = {
  Go: 1,
  Plus: 3,
  Pro: 6,
  Enterprise: 12,
  Basic: 12
};
const addMonthsToDate = (baseDate, months) => {
  const result = new Date(baseDate);
  result.setMonth(result.getMonth() + months);
  return result;
};

// GET Current Subscription
router.get('/', auth, async (req, res) => {
  try {
    let sub = await Subscription.findOne({
      company: req.user.company || req.user.id
    }).sort({
      createdAt: -1
    });
    if (!sub) {
      // Provide a free basic plan by default
      sub = new Subscription({
        company: req.user.company || req.user.id,
        planName: 'Basic',
        status: 'Active',
        startDate: new Date(),
        expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        maxEmployees: 50,
        pricePaid: 0,
        billingCycle: 'Yearly'
      });
      await sub.save();
    }
    res.status(200).json(sub);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error fetching subscription."
    });
  }
});

// UPGRADE Plan (Simulated Payment Gateway)
router.post('/upgrade', auth, async (req, res) => {
  try {
    const {
      planName,
      maxEmployees,
      pricePaid,
      billingCycle,
      durationMonths,
      couponCode,
      originalPrice
    } = req.body;
    const companyId = req.user.company || req.user.id;

    if (planName === 'Free Trial') {
      const admin = await Admin.findById(req.user.id);
      const hasTrialSub = await Subscription.findOne({ company: companyId, planName: 'Free Trial' });
      if ((admin && admin.hasUsedTrial) || hasTrialSub) {
        return res.status(400).json({ message: "Free Trial is only available once per company/admin." });
      }
    }

    let finalAmountPaid = Number(pricePaid) || 0;
    let originalAmount = Number(originalPrice) || finalAmountPaid;

    if (couponCode) {
      const Coupon = require('../models/Coupon');
      const appliedCoupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase(), status: 'active' });
      if (appliedCoupon) {
        let isExpired = appliedCoupon.expiryDate && new Date(appliedCoupon.expiryDate) < new Date();
        let isLimitReached = appliedCoupon.maxUses !== null && appliedCoupon.usedCount >= appliedCoupon.maxUses;
        if (!isExpired && !isLimitReached) {
          appliedCoupon.usedCount += 1;
          const adminUser = await Admin.findById(req.user.id);
          appliedCoupon.usedBy.push({
            adminId: req.user.id,
            companyName: adminUser ? adminUser.companyName : 'Unknown',
            planName,
            originalAmount,
            discountApplied: Math.max(0, originalAmount - finalAmountPaid),
            finalAmountPaid
          });
          await appliedCoupon.save();
        }
      }
    }
    const monthsToAdd = Number(durationMonths) || planDurationMap[planName] || (billingCycle === 'Yearly' ? 12 : 1);
    const latestSubscription = await Subscription.findOne({
      company: companyId
    }).sort({
      createdAt: -1
    });
    const currentExpiry = latestSubscription?.expiryDate ? new Date(latestSubscription.expiryDate) : null;
    const baseDate = currentExpiry && currentExpiry > new Date() ? currentExpiry : new Date();

    // Simulating a successful payment...
    const expiryDate = addMonthsToDate(baseDate, monthsToAdd);
    const newSub = new Subscription({
      company: companyId,
      planName,
      status: 'Active',
      startDate: baseDate,
      expiryDate,
      maxEmployees,
      pricePaid: finalAmountPaid,
      billingCycle
    });
    await newSub.save();

    // Create Invoice
    const invoice = new Invoice({
      company: companyId,
      invoiceNumber: `INV-${Date.now()}`,
      subscriptionId: newSub._id,
      amount: finalAmountPaid,
      totalAmount: finalAmountPaid,
      status: 'Paid',
      paymentDate: new Date()
    });
    await invoice.save();

    // UPDATE Admin document with new subscription details
    const adminUpdate = {
      selectedPlanName: planName,
      subscriptionExpiry: expiryDate,
      autoRenew: true
    };
    if (planName === 'Free Trial') {
      adminUpdate.hasUsedTrial = true;
      adminUpdate.hasPaidTier = false;
    } else {
      adminUpdate.hasPaidTier = true;
    }

    await Admin.findByIdAndUpdate(
      req.user.id,
      { $set: adminUpdate },
      { new: true }
    );

    res.status(200).json({
      message: "Subscription upgraded successfully",
      subscription: newSub
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error upgrading subscription."
    });
  }
});

// GET Invoices
router.get('/invoices', auth, async (req, res) => {
  try {
    const invoices = await Invoice.find({
      company: req.user.company || req.user.id
    }).sort({
      createdAt: -1
    }).populate('subscriptionId');
    res.status(200).json(invoices);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error fetching invoices."
    });
  }
});
module.exports = router;
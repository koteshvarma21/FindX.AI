const Match = require('../models/Match');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const { scoreLostFoundMatch } = require('../services/aiMatchingService');

async function runMatchingForLostItem(lostItemId) {
  const lostItem = await LostItem.findById(lostItemId);
  if (!lostItem || lostItem.status === 'resolved') {
    return [];
  }

  const foundItems = await FoundItem.find({ status: 'active' });
  const results = [];

  for (const foundItem of foundItems) {
    const matchData = await scoreLostFoundMatch(lostItem.toObject(), foundItem.toObject());
    if (matchData.overallScore < 65) {
      continue;
    }

    const payload = {
      lost_item: lostItem._id,
      found_item: foundItem._id,
      match_source: 'found_page',
      semantic_score: matchData.semanticScore,
      location_score: matchData.locationScore,
      time_score: matchData.timeScore,
      category_score: matchData.categoryScore,
      overall_score: matchData.overallScore,
      ai_reason: matchData.aiReason,
      ai_model: matchData.aiModel,
      match_status: 'pending',
    };

    const document = await Match.findOneAndUpdate(
      { lost_item: lostItem._id, found_item: foundItem._id },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    results.push(document);
  }

  return results.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0));
}

async function runMatchingForFoundItem(foundItemId) {
  const foundItem = await FoundItem.findById(foundItemId);
  if (!foundItem || foundItem.status === 'resolved') {
    return [];
  }

  const lostItems = await LostItem.find({ status: 'active' });
  const results = [];

  for (const lostItem of lostItems) {
    const matchData = await scoreLostFoundMatch(lostItem.toObject(), foundItem.toObject());
    if (matchData.overallScore < 65) {
      continue;
    }

    const payload = {
      lost_item: lostItem._id,
      found_item: foundItem._id,
      match_source: 'found_page',
      semantic_score: matchData.semanticScore,
      location_score: matchData.locationScore,
      time_score: matchData.timeScore,
      category_score: matchData.categoryScore,
      overall_score: matchData.overallScore,
      ai_reason: matchData.aiReason,
      ai_model: matchData.aiModel,
      match_status: 'pending',
    };

    const document = await Match.findOneAndUpdate(
      { lost_item: lostItem._id, found_item: foundItem._id },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    results.push(document);
  }

  return results.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0));
}

async function getMatchesForLostItem(req, res) {
  try {
    const { lostItemId } = req.params;
    if (!lostItemId) {
      return res.status(400).json({ success: false, message: 'lostItemId is required' });
    }

    const matches = await Match.find({ lost_item: lostItemId })
      .populate('found_item')
      .sort({ overall_score: -1, created_at: -1 });

    return res.json({
      success: true,
      data: matches,
    });
  } catch (error) {
    console.error('Get lost-item matches error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch match results.' });
  }
}

async function runMatchesForLostItem(req, res) {
  try {
    const { lostItemId } = req.params;
    const results = await runMatchingForLostItem(lostItemId);

    return res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Run lost-item match error:', error);
    return res.status(500).json({ success: false, message: 'Failed to run AI matching.' });
  }
}

async function runMatchesForFoundItem(req, res) {
  try {
    const { foundItemId } = req.params;
    const results = await runMatchingForFoundItem(foundItemId);

    return res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Run found-item match error:', error);
    return res.status(500).json({ success: false, message: 'Failed to run AI matching for found item.' });
  }
}

module.exports = {
  getMatchesForLostItem,
  runMatchingForLostItem,
  runMatchingForFoundItem,
  runMatchesForLostItem,
  runMatchesForFoundItem,
};

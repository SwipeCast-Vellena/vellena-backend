function normalize(s = '') {
    return String(s || '').trim().toLowerCase();
}

function firstWord(s = '') {
    const str = String(s || '').trim();
  if (!str) return '';
  const part = str.split(',')[0]; // if no comma, this returns the whole string
  return part.trim().toLowerCase();
  }

  function cityMatchScore(model, campaign){
    // prefer explicit model.city if available, else use first word of model.location
    const mCity = normalize(model.city || firstWord(model.location || ''));
    const cCity = normalize(campaign.city || '');
    if (!cCity) return 1; // campaign didn't set city => neutral
    if (!mCity) return 0;
  
    if (mCity === cCity) return 1.0;
  
    if (mCity.includes(cCity) || cCity.includes(mCity)) return 0.85;
  
    return 0;
  }


function genderMatchScore(model, campaign) {
    const cPref = normalize(campaign.gender_preference || 'any'); // 'any' | 'women' | 'men'
    const mGenre = normalize(model.genre || '');
    if (cPref === 'any') return 1.0;
    if (!mGenre) return 0;
    if (cPref === 'women' && mGenre === 'female') return 1.0;
    if (cPref === 'men' && mGenre === 'male') return 1.0;
    if (mGenre === 'other') return 0.5;
    return 0;
}

function categoryMatchScore(model, campaign) {
    const mCat = normalize(model.category || '');
    const cCat = normalize(campaign.category || '');
    if (!cCat) return 1.0;
    if (!mCat) return 0;
    if (cCat === 'other') return 0.6; // campaign open to any
    if (mCat === 'other') return 0.5;
    return (mCat === cCat) ? 1.0 : 0;
}

function videoMatchScore(model) {
    return model.video_portfolio && String(model.video_portfolio).trim() ? 1.0 : 0;
}

function calcMatchScore(model, campaign) {
    const weights = { category: 0.35, city: 0.30, gender: 0.20, video: 0.15 };
  
    const catS = categoryMatchScore(model, campaign);
    const cityS = cityMatchScore(model, campaign);
    const genderS = genderMatchScore(model, campaign);
    const videoS = videoMatchScore(model);
  
    const total = catS * weights.category + cityS * weights.city + videoS * weights.video + genderS * weights.gender;
    const score = Math.round(total * 10000) / 100;
  
    return { score, reasons: { catS, cityS, genderS, videoS, weights } };
}

module.exports = { calcMatchScore };


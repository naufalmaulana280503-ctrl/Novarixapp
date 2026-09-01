// Client-side verification eligibility helpers

export const BLUE_REQUIREMENTS = {
  followers: 30000000, // 30 million
  likes: 30000000,
}

export const GOLD_REQUIREMENTS = {
  followers: 10000000, // 10 million (or partner status)
}

export const checkBlueEligibility = (user) => {
  // user: object with followersCount and likesReceived (or similar fields)
  const followers = Number(user?.followersCount || user?.formattedFollowers || 0)
  const likes = Number(user?.likesReceived || user?.totalLikes || 0)

  const followersProgress = Math.min(1, followers / BLUE_REQUIREMENTS.followers)
  const likesProgress = Math.min(1, likes / BLUE_REQUIREMENTS.likes)
  const eligible = followers >= BLUE_REQUIREMENTS.followers && likes >= BLUE_REQUIREMENTS.likes

  return {
    eligible,
    followers,
    likes,
    followersProgress,
    likesProgress,
    required: BLUE_REQUIREMENTS,
  }
}

export const checkGoldEligibility = (user) => {
  // Gold requires business docs or partner status
  const followers = Number(user?.followersCount || user?.formattedFollowers || 0)
  const isPartner = !!user?.isPartner
  const hasBusinessDocs = !!user?.businessVerified // boolean flag from backend indicating docs submitted+verified

  const followersProgress = Math.min(1, followers / GOLD_REQUIREMENTS.followers)
  const eligible = (followers >= GOLD_REQUIREMENTS.followers || isPartner) && hasBusinessDocs

  return {
    eligible,
    followers,
    followersProgress,
    isPartner,
    hasBusinessDocs,
    required: GOLD_REQUIREMENTS,
  }
}

export const checkPurpleEligibility = (user) => {
  // Purple is invite-only / special internal flag
  const invited = !!user?.isInvitedToElite || !!user?.isNovarixElite
  return { eligible: invited, invited }
}

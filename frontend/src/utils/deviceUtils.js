export function getDeviceProfile() {
  const hasNavigator = typeof navigator !== 'undefined'
  const hasMediaDevices = hasNavigator && !!navigator.mediaDevices
  const userAgent = (hasNavigator && navigator.userAgent) ? navigator.userAgent.toLowerCase() : ''

  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(userAgent)
  const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(userAgent)
  const isDesktop = !isMobile && !isTablet

  const deviceProfile = {
    isMobile,
    isTablet,
    isDesktop,
    hasMediaDevices,
    hasCamera: hasMediaDevices && !!navigator.mediaDevices.getUserMedia,
    canScreenShare: hasNavigator && !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
    videoInputs: [],
    audioInputs: [],
    hasFrontCamera: false,
    hasRearCamera: false,
    hasDualCam: false,
    hasAudioInput: false,
    orientation: hasNavigator && typeof window !== 'undefined' ? (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait') : 'desktop',
  }

  return deviceProfile
}

export async function detectMediaDevices() {
  const profile = getDeviceProfile()
  if (!profile.hasMediaDevices || typeof navigator.mediaDevices.enumerateDevices !== 'function') {
    return profile
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoInputs = devices.filter((device) => device.kind === 'videoinput')
    const audioInputs = devices.filter((device) => device.kind === 'audioinput')

    const frontFacing = videoInputs.filter((device) => {
      const label = (device.label || '').toLowerCase()
      return label.includes('front') || label.includes('selfie') || label.includes('user')
    })

    const rearFacing = videoInputs.filter((device) => {
      const label = (device.label || '').toLowerCase()
      return label.includes('back') || label.includes('rear') || label.includes('environment') || label.includes('wide')
    })

    return {
      ...profile,
      videoInputs,
      audioInputs,
      hasFrontCamera: videoInputs.length > 0 || frontFacing.length > 0,
      hasRearCamera: rearFacing.length > 0 || videoInputs.length > 1,
      hasDualCam: videoInputs.length > 1,
      hasAudioInput: audioInputs.length > 0,
    }
  } catch (error) {
    console.warn('detectMediaDevices failed:', error)
    return profile
  }
}

export function getSourceModes(deviceProfile) {
  const modes = ['front']

  if (deviceProfile.hasRearCamera) modes.push('rear')
  if (deviceProfile.hasDualCam || deviceProfile.videoInputs.length > 1) modes.push('dual')
  if (deviceProfile.canScreenShare) modes.push('screen-pip')

  return modes
}

export function normalizeAudioConstraint(deviceId, additionalConstraints = {}) {
  const base = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    ...additionalConstraints,
  }

  if (deviceId) {
    return {
      ...base,
      deviceId: { exact: deviceId },
    }
  }

  return base
}

export async function safeGetUserMedia(constraints) {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    const error = new Error('Media devices are unsupported in this browser.')
    error.code = 'NOT_SUPPORTED'
    throw error
  }

  try {
    return await navigator.mediaDevices.getUserMedia(constraints)
  } catch (error) {
    console.warn('safeGetUserMedia failed:', error)
    throw error
  }
}

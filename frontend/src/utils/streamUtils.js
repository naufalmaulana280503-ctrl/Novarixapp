// Helpers for mixing video sources into a canvas stream and combining with audio
export async function mixSourcesToCanvasStream({ videoElements = [], width = 1280, height = 720, fps = 30, layout = 'single', applyEffect }) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  // prefer WebGL for performance; fallback to 2d
  const ctx = canvas.getContext('2d')

  let rafId = null
  function drawFrame() {
    try {
      ctx.clearRect(0, 0, width, height)

      if (layout === 'single') {
        const v = videoElements[0]
        if (v && v.readyState >= 2) ctx.drawImage(v, 0, 0, width, height)
      } else if (layout === 'dual') {
        const left = videoElements[0], right = videoElements[1]
        if (left && left.readyState >= 2) ctx.drawImage(left, 0, 0, width/2, height)
        if (right && right.readyState >= 2) ctx.drawImage(right, width/2, 0, width/2, height)
      } else if (layout === 'pip') {
        const main = videoElements[0], pip = videoElements[1]
        if (main && main.readyState >= 2) ctx.drawImage(main, 0, 0, width, height)
        if (pip && pip.readyState >= 2) {
          const pipW = Math.floor(width/4), pipH = Math.floor(height/4)
          ctx.drawImage(pip, width - pipW - 16, height - pipH - 16, pipW, pipH)
        }
      }

      // placeholder hook for applyEffect(canvas, ctx)
      if (applyEffect && typeof applyEffect === 'function') {
        try { applyEffect(canvas, ctx) } catch (e) { console.warn('applyEffect error', e) }
      }
    } catch (e) {
      // ignore drawing errors
      // console.warn('drawFrame err', e)
    }
    rafId = requestAnimationFrame(drawFrame)
  }

  drawFrame()

  const mixedVideoStream = canvas.captureStream(fps)
  mixedVideoStream.__stop = () => {
    if (rafId) cancelAnimationFrame(rafId)
    mixedVideoStream.getTracks().forEach(t => t.stop())
  }

  return { mixedVideoStream, canvas }
}

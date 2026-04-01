export async function processLogoDataUrl(logoDataUrl: string, monochrome: boolean) {
  if (!logoDataUrl || !monochrome) return logoDataUrl

  return new Promise<string>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth || image.width
      canvas.height = image.naturalHeight || image.height
      const context = canvas.getContext('2d')

      if (!context) {
        reject(new Error('Não foi possível preparar a logo para impressão.'))
        return
      }

      context.drawImage(image, 0, 0)
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      const { data } = imageData

      for (let index = 0; index < data.length; index += 4) {
        const alpha = data[index + 3]
        if (alpha === 0) continue

        const luminance = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114
        const value = luminance > 168 ? 255 : 0
        data[index] = value
        data[index + 1] = value
        data[index + 2] = value
      }

      context.putImageData(imageData, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    image.onerror = () => reject(new Error('Não foi possível processar a logo institucional.'))
    image.src = logoDataUrl
  })
}

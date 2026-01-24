/**
 * Contabo S3 Storage Uploader for Browser
 * Uploads images to Contabo storage via API route and returns the public URL
 */

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Upload a file to Contabo S3 storage using API route
 */
export async function uploadToContabo(file: File): Promise<UploadResult> {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Upload failed')
    }

    return {
      success: true,
      url: data.url,
    }
  } catch (error) {
    console.error('Error uploading to Contabo:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}


/**
 * Validate file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  const maxSize = 10 * 1024 * 1024 // 10MB

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.',
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size too large. Maximum size is 10MB.',
    }
  }

  return { valid: true }
}


import type { SupabaseClient } from '@supabase/supabase-js'

export const REQUEST_IMAGE_BUCKET = 'client-uploads'

export const REQUEST_STATUS_VALUES = [
  'submitted',
  'notified',
  'viewed',
  'responded',
  'closed',
  'cancelled',
] as const

export type RequestStatus = (typeof REQUEST_STATUS_VALUES)[number]

export const REQUEST_TYPE_VALUES = ['direct', 'match'] as const

export type RequestType = (typeof REQUEST_TYPE_VALUES)[number]

export type RequestImageSource =
  | File
  | {
      bytes: ArrayBuffer
      filename?: string
      contentType?: string
    }
  | {
      uri: string
      filename?: string
      contentType?: string
    }

export type RequestImageSources = {
  inspiration?: RequestImageSource | null
  current?: RequestImageSource | null
}

export type RequestImagePaths = {
  inspiration_image_path: string | null
  current_photo_path: string | null
}

export type RequestRecord = {
  id: string
  user_id: string
  professional_id: string | null
  portfolio_item_id: string | null
  match_request_id: string | null
  request_type: RequestType
  message: string
  preferred_date_text: string | null
  client_name: string | null
  client_email: string | null
  client_phone: string | null
  provider_name_snapshot: string | null
  portfolio_title_snapshot: string | null
  category_snapshot: string | null
  portfolio_image_url_snapshot: string | null
  pro_look_snapshot_path: string | null
  inspiration_image_path: string | null
  current_photo_path: string | null
  status: RequestStatus
  provider_notified_at: string | null
  notified_channels: string[]
  notification_error: string | null
  created_at: string
  updated_at: string
}

export type RequestRecordWithAssets = RequestRecord & {
  inspiration_image_url: string | null
  current_photo_url: string | null
}

export type CreateRequestInput = {
  id?: string
  professionalId?: string | null
  portfolioItemId?: string | null
  matchRequestId?: string | null
  requestType?: RequestType
  message: string
  preferredDateText?: string | null
  clientName?: string | null
  clientEmail?: string | null
  clientPhone?: string | null
  providerNameSnapshot?: string | null
  portfolioTitleSnapshot?: string | null
  categorySnapshot?: string | null
  portfolioImageUrlSnapshot?: string | null
  proLookSnapshotPath?: string | null
  imagePaths?: RequestImagePaths
}

export type RequestHistoryQuery = {
  limit?: number
  offset?: number
  status?: RequestStatus
}

export type RequestServiceResult<T> = {
  data: T | null
  error: string | null
}

export type RequestSubmitPayload = {
  supabase: SupabaseClient
  request: CreateRequestInput
  images?: RequestImageSources
}

export type NotifyAttachmentPart = {
  filename: string
  contentType: string
  base64: string
}

export type NotifyProviderPayload = {
  requestId: string
  portfolioItemId: string
  proName: string
  message: string
  preferredDate: string
  inspirationImageName: string
  currentPhotoName: string
  createdAt: string
  clientName: string
  clientEmail: string
  clientPhone: string
  portfolioImageUrl: string
  serviceTitle: string
  phoneNumber: string
  proEmail: string
  attachments: {
    inspiration: NotifyAttachmentPart | null
    current: NotifyAttachmentPart | null
  }
  inspirationStoragePath?: string
  currentPhotoStoragePath?: string
}

export type NotifyProviderResult = {
  ok: boolean
  skipped?: boolean
  sent?: string[]
  warning?: string
}

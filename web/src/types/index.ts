export interface Country {
  name: string
  code: string
  flag: string
}

export interface Category {
  id: string
  name: string
  description?: string
}

export interface Channel {
  id: string
  name: string
  alt_names: string[]
  network: string | null
  owners: string[]
  country: string
  categories: string[]
  is_nsfw: boolean
  launched: string | null
  closed: string | null
  replaced_by: string | null
  website: string | null
}

export interface Logo {
  channel: string
  feed: string | null
  tags: string[]
  width: number
  height: number
  format: string
  url: string
}

export interface Stream {
  id: string
  title: string
  url: string
  tvgId: string | null
  groupTitle: string
  logo?: string
  quality?: string
  label?: string
  referrer?: string
  userAgent?: string
}

export interface PlaylistSource {
  type: 'country' | 'category' | 'index'
  id: string
  label: string
}

export interface Version {
  major: number
  minor: number
  fix: number
}

export interface Release {
  current: Version
  new: Version
  commit: string
  content?: string
}

export interface GitHubAuth {
  repo: string
  owner: string
  token: string
}

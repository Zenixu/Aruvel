export interface Source { id: string; name: string; site: string; lang: 'en' | 'id' | 'local'; legal: 'public-domain' | 'author-platform' | 'user-risk' }
export interface Novel { id?: number; sourceId: string; path: string; name: string; cover?: string; summary?: string; author?: string; status: 'ongoing' | 'completed' | 'hiatus' | 'unknown'; declaredChapters?: number; localFile?: string; lastReadAt?: number }
export interface Chapter { id?: number; novelId: number; name: string; path: string; chapterNumber?: number; releaseTime?: string; position: number; isRead: boolean; lastParagraph: number; updatedAt: number }
export interface ChapterContent { id?: number; chapterId: number; filePath: string; size: number; downloadedAt: number }
export interface EpubChapterContent extends ChapterContent { content: string }
export function isEpubChapterContent(content: ChapterContent | undefined): content is EpubChapterContent {
  return !!content && 'content' in content && typeof content.content === 'string'
}
export interface Category { id?: number; name: string; order: number }
export interface NovelCategory { id?: number; novelId: number; categoryId: number }
export interface Setting { key: string; value: string }
export interface LibraryNovel extends Novel { id: number; unreadCount: number; lastReadAt: number; categories: Category[] }

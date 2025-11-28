'use client'

import { useEffect, useState } from 'react'

interface OGPData {
  title: string
  description: string
  image: string
  siteName: string
  url: string
}

export default function LinkPreview({ url }: { url: string }) {
  const [data, setData] = useState<OGPData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/ogp?url=${encodeURIComponent(url)}`)
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        if (json.error) throw new Error(json.error)
        setData(json)
      } catch (err) {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [url])

  if (loading) {
    return (
      <div className="mt-2 w-full max-w-sm animate-pulse rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-2 h-32 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
        <div className="mb-2 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
        <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700"></div>
      </div>
    )
  }

  if (error || !data) {
    return null
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 block w-full max-w-sm overflow-hidden rounded-lg border border-gray-200 bg-white transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-750"
    >
      {data.image && (
        <div className="relative h-40 w-full overflow-hidden">
          <img
            src={data.image}
            alt={data.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="p-4">
        <h3 className="mb-1 line-clamp-2 text-sm font-bold text-gray-900 dark:text-gray-100">
          {data.title}
        </h3>
        <p className="mb-2 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">
          {data.description}
        </p>
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-500">
          {/* Optional: Add favicon here if available */}
          <span>{data.siteName || new URL(url).hostname}</span>
        </div>
      </div>
    </a>
  )
}

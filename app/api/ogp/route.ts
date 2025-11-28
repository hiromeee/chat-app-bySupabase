import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.statusText}` },
        { status: response.status }
      )
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const getMetaTag = (name: string) =>
      $(`meta[property="${name}"]`).attr('content') ||
      $(`meta[name="${name}"]`).attr('content')

    const title =
      getMetaTag('og:title') ||
      $('title').text() ||
      getMetaTag('twitter:title') ||
      ''
    const description =
      getMetaTag('og:description') ||
      getMetaTag('description') ||
      getMetaTag('twitter:description') ||
      ''
    let image =
      getMetaTag('og:image') ||
      getMetaTag('twitter:image') ||
      $('link[rel="image_src"]').attr('href') ||
      ''
    const siteName = getMetaTag('og:site_name') || ''

    // Handle relative URLs for image
    if (image && !image.startsWith('http')) {
      try {
        const baseUrl = new URL(url)
        image = new URL(image, baseUrl).toString()
      } catch (e) {
        console.error('Error resolving relative image URL:', e)
      }
    }

    return NextResponse.json({
      title,
      description,
      image,
      siteName,
      url,
    })
  } catch (error) {
    console.error('Error fetching OGP:', error)
    return NextResponse.json(
      { error: 'Failed to fetch OGP data' },
      { status: 500 }
    )
  }
}

import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { ContentItem, TimeOfDay } from "@/lib/types";

const TWITTER_RECENT_SEARCH_ENDPOINT = "https://api.x.com/2/tweets/search/recent";
const TWITTER_FETCH_TIMEOUT_MS = 15_000;
const POWERSHELL_FETCH_TIMEOUT_MS = 30_000;
const execFileAsync = promisify(execFile);

interface TwitterRecentSearchTweet {
  author_id?: string;
  created_at?: string;
  id: string;
  public_metrics?: {
    like_count?: number;
    reply_count?: number;
    retweet_count?: number;
  };
  text: string;
}

interface TwitterRecentSearchUser {
  id: string;
  name?: string;
  profile_image_url?: string;
  username?: string;
}

interface TwitterRecentSearchResponse {
  data?: TwitterRecentSearchTweet[];
  errors?: Array<{
    detail?: string;
    title?: string;
  }>;
  includes?: {
    users?: TwitterRecentSearchUser[];
  };
}

interface TwitterPowerShellProbeResponse {
  status: number;
  body: string;
}

export interface TwitterPostsSnapshot {
  rawItems: ContentItem[];
  items: ContentItem[];
}

function inferTimeOfDay(publishedAt: string): TimeOfDay {
  const hour = Number.parseInt(publishedAt.slice(11, 13), 10);

  if (Number.isNaN(hour) || hour < 12) {
    return "上午";
  }

  if (hour < 18) {
    return "下午";
  }

  return "晚上";
}

function getPublishTimestamp(item: Pick<ContentItem, "publishTimestamp" | "publishTime" | "publishedAt">) {
  if (typeof item.publishTimestamp === "number") {
    return item.publishTimestamp;
  }

  const parsed = Date.parse(item.publishTime || item.publishedAt);
  return Number.isNaN(parsed) ? 0 : Math.floor(parsed / 1000);
}

function sortContentItemsByPublishTimeDesc(items: ContentItem[]) {
  return [...items].sort((left, right) => {
    const rightTimestamp = getPublishTimestamp(right);
    const leftTimestamp = getPublishTimestamp(left);

    if (rightTimestamp !== leftTimestamp) {
      return rightTimestamp - leftTimestamp;
    }

    return (left.rawOrderIndex ?? 0) - (right.rawOrderIndex ?? 0);
  });
}

function buildHeatScore(likes: number, replies: number, reposts: number) {
  const score = Math.round(likes / 4 + replies * 2 + reposts * 3);
  return Math.max(55, Math.min(99, score));
}

function getUserForTweet(
  tweet: TwitterRecentSearchTweet,
  users: TwitterRecentSearchUser[] | undefined
) {
  return users?.find((user) => user.id === tweet.author_id);
}

function buildArticleUrl(tweetId: string, username: string) {
  return `https://x.com/${username}/status/${tweetId}`;
}

function mapTweetToContentItem(
  tweet: TwitterRecentSearchTweet,
  keyword: string,
  rawOrderIndex: number,
  users: TwitterRecentSearchUser[] | undefined
): ContentItem {
  const user = getUserForTweet(tweet, users);
  const username = user?.username || "";
  const displayName = user?.name || "";
  const publishedAt = tweet.created_at || "";
  const publishTimestamp = getPublishTimestamp({
    publishedAt,
    publishTime: publishedAt,
    publishTimestamp: publishedAt ? Math.floor(Date.parse(publishedAt) / 1000) : 0
  });
  const articleUrl = username ? buildArticleUrl(tweet.id, username) : "";
  const likes = tweet.public_metrics?.like_count ?? 0;
  const replies = tweet.public_metrics?.reply_count ?? 0;
  const reposts = tweet.public_metrics?.retweet_count ?? 0;

  return {
    id: `twitter-${keyword}-${tweet.id}`,
    date: publishedAt.slice(0, 10),
    timeOfDay: inferTimeOfDay(publishedAt),
    platformId: "twitter",
    title: tweet.text,
    summary: tweet.text,
    author: username ? `@${username}` : displayName,
    authorName: displayName,
    authorId: tweet.author_id,
    publishedAt,
    publishTime: publishedAt,
    publishTimestamp,
    heatScore: buildHeatScore(likes, replies, reposts),
    metrics: {
      likes: `${likes}`,
      comments: `${replies}`,
      saves: `${reposts}`
    },
    readCount: undefined,
    likeCount: likes,
    matchedTargets: [keyword].filter(Boolean),
    aiSummary: tweet.text,
    keyword,
    avatar: user?.profile_image_url,
    linkedTopicIds: [],
    includedInDailyReport: false,
    inTopicPool: false,
    articleUrl,
    sourceUrl: articleUrl,
    rawOrderIndex
  };
}

function formatTwitterError(payload: TwitterRecentSearchResponse, status: number) {
  const detail = payload.errors?.[0]?.detail || payload.errors?.[0]?.title;

  if (detail) {
    return `Twitter monitor request failed with status ${status}: ${detail}`;
  }

  return `Twitter monitor request failed with status ${status}`;
}

function formatTwitterRequestFailure(error: unknown) {
  if (!(error instanceof Error)) {
    return "Twitter monitor request failed";
  }

  const cause = error.cause as { code?: string; message?: string } | undefined;

  if (cause?.code === "UND_ERR_CONNECT_TIMEOUT") {
    return "Twitter monitor request timed out while connecting to the X API";
  }

  return error.message || "Twitter monitor request failed";
}

function buildTwitterSearchUrl(keyword: string) {
  const url = new URL(TWITTER_RECENT_SEARCH_ENDPOINT);
  url.searchParams.set("query", keyword);
  url.searchParams.set("max_results", "10");
  url.searchParams.set("tweet.fields", "author_id,created_at,public_metrics");
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("user.fields", "username,name,profile_image_url");

  return url;
}

function parseTwitterResponseBody(body: string) {
  if (!body) {
    return {} as TwitterRecentSearchResponse;
  }

  try {
    return JSON.parse(body) as TwitterRecentSearchResponse;
  } catch {
    return {
      errors: [
        {
          detail: body
        }
      ]
    } satisfies TwitterRecentSearchResponse;
  }
}

async function fetchTwitterMonitorDataViaPowerShell(keyword: string) {
  const encodedUrl = buildTwitterSearchUrl(keyword).toString().replace(/'/g, "''");
  const encodedCommand = Buffer.from(
    `
$ErrorActionPreference = 'Stop'
$rawToken = $env:TWITTER_BEARER_TOKEN
$token = [System.Uri]::UnescapeDataString($rawToken)
$uri = '${encodedUrl}'

try {
  $response = Invoke-WebRequest -Uri $uri -Headers @{ Authorization = "Bearer $token" } -Method GET -TimeoutSec 20 -UseBasicParsing
  $payload = @{ status = [int]$response.StatusCode; body = $response.Content } | ConvertTo-Json -Compress
  Write-Output $payload
}
catch {
  $status = 0
  $body = ''

  if ($_.Exception.Response) {
    $status = [int]$_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()

    if ($stream) {
      $reader = New-Object System.IO.StreamReader($stream)
      $body = $reader.ReadToEnd()
      $reader.Dispose()
    }
  }
  else {
    $body = $_.Exception.Message
  }

  $payload = @{ status = $status; body = $body } | ConvertTo-Json -Compress
  Write-Output $payload

  if ($status -eq 0) {
    exit 1
  }
}
`,
    "utf16le"
  ).toString("base64");

  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoLogo", "-NoProfile", "-EncodedCommand", encodedCommand],
      {
        timeout: POWERSHELL_FETCH_TIMEOUT_MS,
        windowsHide: true,
        maxBuffer: 4 * 1024 * 1024,
        env: process.env
      }
    );
    const probe = JSON.parse(stdout.trim()) as TwitterPowerShellProbeResponse;
    const payload = parseTwitterResponseBody(probe.body);

    if (probe.status >= 200 && probe.status < 300) {
      return payload;
    }

    throw new Error(formatTwitterError(payload, probe.status || 502));
  } catch (error) {
    if (error && typeof error === "object" && "stdout" in error && typeof error.stdout === "string") {
      try {
        const probe = JSON.parse(error.stdout.trim()) as TwitterPowerShellProbeResponse;
        const payload = parseTwitterResponseBody(probe.body);

        if (probe.status >= 200 && probe.status < 300) {
          return payload;
        }

        throw new Error(formatTwitterError(payload, probe.status || 502));
      } catch {
        // fall through to the generic request failure below
      }
    }

    throw new Error(formatTwitterRequestFailure(error));
  }
}

function normalizeBearerToken(token: string | undefined) {
  if (!token) {
    return "";
  }

  if (!token.includes("%")) {
    return token;
  }

  try {
    return decodeURIComponent(token);
  } catch {
    return token;
  }
}

async function fetchTwitterMonitorData(keyword: string) {
  const token = normalizeBearerToken(process.env.TWITTER_BEARER_TOKEN);

  if (!token) {
    throw new Error("Missing TWITTER_BEARER_TOKEN");
  }

  const url = buildTwitterSearchUrl(keyword);
  let response: Response;

  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      },
      cache: "no-store",
      signal: AbortSignal.timeout(TWITTER_FETCH_TIMEOUT_MS)
    });
  } catch (error) {
    return fetchTwitterMonitorDataViaPowerShell(keyword).catch((fallbackError) => {
      if (fallbackError instanceof Error) {
        throw fallbackError;
      }

      throw new Error(formatTwitterRequestFailure(error));
    });
  }

  const payload = (await response.json()) as TwitterRecentSearchResponse;
  const hasTweetArray = Array.isArray(payload.data);

  if (!response.ok && !hasTweetArray) {
    throw new Error(formatTwitterError(payload, response.status));
  }

  if (payload.errors?.length) {
    const firstError = payload.errors[0];
    throw new Error(firstError.detail || firstError.title || "Twitter monitor returned invalid data");
  }

  return hasTweetArray ? payload : { data: [] as TwitterRecentSearchTweet[] };
}

export async function searchTwitterPostsSnapshotByKeyword(keyword: string) {
  const payload = await fetchTwitterMonitorData(keyword);
  const tweets = payload.data ?? [];
  const users = payload.includes?.users;
  const rawItems = tweets.map((tweet, index) => mapTweetToContentItem(tweet, keyword, index, users));
  const items = sortContentItemsByPublishTimeDesc(rawItems);

  return {
    rawItems,
    items
  } satisfies TwitterPostsSnapshot;
}

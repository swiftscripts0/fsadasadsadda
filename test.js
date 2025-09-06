import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
const PORT = 4000;
function randomUrl() {
  const domains = [
    "https://brightwave.io",
    "https://northfield.net",
    "https://crimsonpeak.org",
    "https://lunarbyte.com",
    "https://silverpine.co",
    "https://oakridge.dev",
    "https://maplestreet.io",
    "https://sunsetgrove.net",
    "https://blueharbor.org",
    "https://ironcladtech.com",
    "https://wildstone.co",
    "https://evercrest.io",
    "https://pinehill.net",
    "https://verdantlabs.org",
    "https://stormlake.com",
    "https://driftwood.co",
    "https://copperfield.io",
    "https://whisperingwinds.net",
    "https://cedarcrest.org",
    "https://glimmeringpeak.com",
    "https://starlitpath.co",
    "https://horizonbay.io",
    "https://maplewoodlabs.net",
    "https://crystalgrove.org",
    "https://riverside.tech",
    "https://mistyvale.com",
    "https://ironridge.co",
    "https://skyforge.io",
    "https://shadowbrook.net",
    "https://sunpeak.org",
    "https://winterfield.com",
    "https://redcliff.co",
    "https://goldenmeadow.io",
    "https://pinehollow.net",
    "https://silverstream.org",
    "https://moonridge.com",
    "https://stormcliff.co",
    "https://echohollow.io",
    "https://wildgrove.net",
    "https://crimsonvalley.org",
    "https://brightcliff.com",
    "https://glimmerlake.co",
    "https://frostpeak.io",
    "https://shadowpine.net",
    "https://evercrest.org",
    "https://maplepoint.com",
    "https://mistybrook.co",
    "https://ironwood.io",
  ];

  return domains[Math.floor(Math.random() * domains.length)];
}

function makeHeaders(useRandom = true, overrideUrl) {
  let refererUrl;

  if (overrideUrl) {
    refererUrl = overrideUrl;
  } else if (useRandom) {
    refererUrl = randomUrl();
  } else {
    refererUrl = "https://cloudnestra.com";
  }

  return {
    origin: refererUrl,
    referer: refererUrl + (refererUrl.endsWith("/") ? "" : "/"),
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
  };
}

app.get("/movie/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // STEP 1: fetch movie embed
    const embedUrl = `https://cdn.moviesapi.club/embed/movie/${id}`;
    console.log("Embed URL:", embedUrl);

    const embedResp = await axios.get(embedUrl, { headers: makeHeaders(true) });
    const $embed = cheerio.load(embedResp.data);

    // STEP 2: extract iframe src
    let iframeSrc = $embed("#player_iframe").attr("src");
    if (!iframeSrc) throw new Error("Could not find iframe");
    iframeSrc = "https:" + iframeSrc.replace(/^\/\//, "");
    console.log("First iframe URL:", iframeSrc);

    const iframeResp = await axios.get(iframeSrc, {
      headers: makeHeaders(true),
    });
    const $iframe = cheerio.load(iframeResp.data);

    // STEP 3: find prorcp src
    const iframeScript = $iframe("script")
      .map((i, el) => $iframe(el).html())
      .get()
      .join("\n");
    const prorcpMatch = iframeScript.match(/src:\s*['"]([^'"]+)['"]/);
    if (!prorcpMatch) throw new Error("Could not find prorcp src");
    let prorcpUrl = "https://cloudnestra.com" + prorcpMatch[1];
    console.log("Prorcp URL:", prorcpUrl);

    const prorcpResp = await axios.get(prorcpUrl, {
      headers: makeHeaders(true),
    });
    const $prorcp = cheerio.load(prorcpResp.data);

    // STEP 4: extract Playerjs config
    const prorcpScript = $prorcp("script")
      .map((i, el) => $prorcp(el).html())
      .get()
      .join("\n");
    const fileMatch = prorcpScript.match(/file:\s*['"]([^'"]+)['"]/);
    if (!fileMatch) throw new Error("Could not find final file");

    let finalM3u8 = fileMatch[1];
    console.log("Final m3u8:", finalM3u8);

    // STEP 5: wrap in your m3u8-proxy with headers
    const headers = {
      Origin: "https://cloudnestra.com",
      Referer: "https://cloudnestra.com/",
    };

    const proxiedUrl = `https://simple-proxyy.swiftau69.workers.dev/m3u8-proxy?url=${encodeURIComponent(
      finalM3u8
    )}&headers=${encodeURIComponent(JSON.stringify(headers))}`;

    console.log("Proxied URL:", proxiedUrl);

    res.json({ file: proxiedUrl });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

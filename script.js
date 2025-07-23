/* global shaka, pako */
/* eslint-disable no-console */

// Constants for Converge channels - use the original URLs
const CONVRG_BASE_URL = "http://143.44.136.110:6910/001/2/"
const CONVRG_MANIFEST_SUFFIX = "/manifest.mpd?virtualDomain=001.live_hls.zte.com"
const CONVRG_LICENSE_URI = "http://143.44.136.74:9443/widevine/?deviceId=02:00:00:00:00:00"

// Helper to generate IDs
function generateChannelId(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .substring(0, 20) || `ch${Date.now().toString(36)}`
  )
}

class ShakaTV {
  constructor() {
    /* ---------- core state ---------- */
    this.channels = []
    this.currentChannel = null
    this.currentCategory = "all"
    this.player = null
    this.testingInProgress = false
    this.favorites = new Set(JSON.parse(localStorage.getItem("shakatv:favorites") || "[]"))
    this.theme = localStorage.getItem("shakatv:theme") || "dark"

    /* ---------- dom ---------- */
    this.video = document.getElementById("videoPlayer")
    this.channelsList = document.getElementById("channelsList")
    this.searchInput = document.getElementById("searchInput")
    this.loadingSpinner = document.getElementById("loadingSpinner")
    this.channelsCountLbl = document.getElementById("channelsCount")
    this.progressFill = document.getElementById("progressFill")
    this.testStatus = document.getElementById("testStatus")
    this.testAllBtn = document.getElementById("testAllBtn")
    this.themeBtn = document.getElementById("themeBtn")

    /* ---------- boot ---------- */
    this.initShaka()
    this.bindUI()
    this.loadAllChannels() // Load all channels from the provided list
    this.applyTheme()
    this.renderChannels()
  }

  /* ==== INIT ==== */
  initShaka() {
    if (!window.shaka.Player.isBrowserSupported()) {
      alert("Shaka Player not supported in this browser")
      return
    }
    this.player = new window.shaka.Player(this.video)
  }

  bindUI() {
    /* search */
    this.searchInput.addEventListener("input", () => this.renderChannels())

    /* category buttons */
    document.querySelectorAll(".category-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".category-btn").forEach((b) => b.classList.remove("active"))
        btn.classList.add("active")
        this.currentCategory = btn.dataset.category
        this.renderChannels()
      })
    })

    /* test-all */
    this.testAllBtn.addEventListener("click", () => this.testAllChannels())

    /* theme toggle */
    this.themeBtn.addEventListener("click", () => this.toggleTheme())

    /* drag-drop TXT */
    document.addEventListener("dragover", (e) => e.preventDefault())
    document.addEventListener("drop", (e) => {
      e.preventDefault()
      const f = e.dataTransfer.files?.[0]
      if (f && f.name.endsWith(".txt")) this.loadChannelsFromTxtFile(f)
    })

    /* Ensure video is unmuted when user interacts with the page */
    document.addEventListener("click", () => {
      if (this.video.muted) {
        this.video.muted = false
      }
    })
  }

  /* ==== THEME ==== */
  toggleTheme() {
    this.theme = this.theme === "dark" ? "light" : "dark"
    localStorage.setItem("shakatv:theme", this.theme)
    this.applyTheme()
  }

  applyTheme() {
    document.body.className = `theme-${this.theme}`
    this.themeBtn.textContent = this.theme === "dark" ? "☀️" : "🌙"
    this.themeBtn.title = `Switch to ${this.theme === "dark" ? "light" : "dark"} theme`
  }

  /* ==== CHANNELS ==== */
  loadAllChannels() {
    const defaultChannelList = [
      // Beta Converge Channels (Widevine DRM)
      {
        name: "GMA 7",
        manifest:
          "http://143.44.136.110:6910/001/2/ch00000090990000001093/manifest.mpd?virtualDomain=001.live_hls.zte.com",
        drm: {
          type: "widevine",
          licenseUri: CONVRG_LICENSE_URI,
        },
        category: "beta",
      },
      {
        name: "GTV",
        manifest:
          "http://143.44.136.110:6910/001/2/ch00000090990000001143/manifest.mpd?virtualDomain=001.live_hls.zte.com",
        drm: {
          type: "widevine",
          licenseUri: "http://143.44.136.74:9443/widevine/?deviceId=02:00:00:00:00:00",
        },
        category: "beta",
      },
      {
        name: "Cartoon Network (Converge)",
        manifest:
          "http://143.44.136.110:6910/001/2/ch00000090990000001178/manifest.mpd?virtualDomain=001.live_hls.zte.com",
        drm: {
          type: "widevine",
          licenseUri: "http://143.44.136.74:9443/widevine/?deviceId=02:00:00:00:00:00",
        },
        category: "beta",
      },
      {
        name: "GNN",
        manifest:
          "http://143.44.136.110:6910/001/2/ch00000090990000001234/manifest.mpd?virtualDomain=001.live_hls.zte.com",
        drm: {
          type: "widevine",
          licenseUri: "http://143.44.136.74:9443/widevine/?deviceId=02:00:00:00:00:00",
        },
        category: "beta",
      },

      // Nick Channels
      {
        name: "Nickelodeon SD",
        manifest: "https://qp-pldt-live-grp-11-prod.akamaized.net/out/u/dr_nickelodeon.mpd",
        drm: {
          type: "clearkey",
          keyId: "9ce58f37576b416381b6514a809bfd8b",
          key: "f0fbb758cdeeaddfa3eae538856b4d72",
        },
        category: "kids",
      },
      {
        name: "Nick Jr",
        manifest: "https://qp-pldt-live-grp-12-prod.akamaized.net/out/u/dr_nickjr.mpd",
        drm: {
          type: "clearkey",
          keyId: "bab5c11178b646749fbae87962bf5113",
          key: "0ac679aad3b9d619ac39ad634ec76bc8",
        },
        category: "kids",
      },

      // Movies
      {
        name: "tvN Movies Pinoy",
        manifest: "https://qp-pldt-live-grp-07-prod.akamaized.net/out/u/cg_tvnmovie.mpd",
        drm: {
          type: "clearkey",
          keyId: "2e53f8d8a5e94bca8f9a1e16ce67df33",
          key: "3471b2464b5c7b033a03bb8307d9fa35",
        },
        category: "movies",
      },
      {
        name: "Tap Movies",
        manifest: "https://qp-pldt-live-grp-06-prod.akamaized.net/out/u/cg_tapmovies_hd1.mpd",
        drm: {
          type: "clearkey",
          keyId: "71cbdf02b595468bb77398222e1ade09",
          key: "c3f2aa420b8908ab8761571c01899460",
        },
        category: "movies",
      },
      {
        name: "Pinoy Box Office (PBO)",
        manifest: "https://qp-pldt-live-grp-04-prod.akamaized.net/out/u/pbo_sd.mpd",
        drm: {
          type: "clearkey",
          keyId: "dcbdaaa6662d4188bdf97f9f0ca5e830",
          key: "31e752b441bd2972f2b98a4b1bc1c7a1",
        },
        category: "movies",
      },
      {
        name: "Viva Cinema",
        manifest: "https://qp-pldt-live-grp-06-prod.akamaized.net/out/u/viva_sd.mpd",
        drm: {
          type: "clearkey",
          keyId: "07aa813bf2c147748046edd930f7736e",
          key: "3bd6688b8b44e96201e753224adfc8fb",
        },
        category: "movies",
      },
      {
        name: "Tagalog Movie Channel (TMC)",
        manifest: "https://qp-pldt-live-grp-07-prod.akamaized.net/out/u/cg_tagalogmovie.mpd",
        drm: {
          type: "clearkey",
          keyId: "96701d297d1241e492d41c397631d857",
          key: "ca2931211c1a261f082a3a2c4fd9f91b",
        },
        category: "movies",
      },
      {
        name: "HBO",
        manifest: "https://qp-pldt-live-grp-03-prod.akamaized.net/out/u/cg_hbohd.mpd",
        drm: {
          type: "clearkey",
          keyId: "d47ebabf7a21430b83a8c4b82d9ef6b1",
          key: "54c213b2b5f885f1e0290ee4131d425b",
        },
        category: "movies",
      },
      {
        name: "HBO Hits",
        manifest: "https://qp-pldt-live-grp-09-prod.akamaized.net/out/u/cg_hbohits.mpd",
        drm: {
          type: "clearkey",
          keyId: "b04ae8017b5b4601a5a0c9060f6d5b7d",
          key: "a8795f3bdb8a4778b7e888ee484cc7a1",
        },
        category: "movies",
      },
      {
        name: "HBO Signature",
        manifest: "https://qp-pldt-live-grp-01-prod.akamaized.net/out/u/cg_hbosign.mpd",
        drm: {
          type: "clearkey",
          keyId: "a06ca6c275744151895762e0346380f5",
          key: "559da1b63eec77b5a942018f14d3f56f",
        },
        category: "movies",
      },
      {
        name: "HBO Family",
        manifest: "https://qp-pldt-live-grp-03-prod.akamaized.net/out/u/cg_hbofam.mpd",
        drm: {
          type: "clearkey",
          keyId: "872910c843294319800d85f9a0940607",
          key: "f79fd895b79c590708cf5e8b5c6263be",
        },
        category: "movies",
      },
      {
        name: "Cinemax",
        manifest: "https://qp-pldt-live-grp-01-prod.akamaized.net/out/u/cg_cinemax.mpd",
        drm: {
          type: "clearkey",
          keyId: "b207c44332844523a3a3b0469e5652d7",
          key: "fe71aea346db08f8c6fbf0592209f955",
        },
        category: "movies",
      },
      {
        name: "Tap Action Flix",
        manifest: "https://qp-pldt-live-grp-06-prod.akamaized.net/out/u/cg_tapactionflix_hd1.mpd",
        drm: {
          type: "clearkey",
          keyId: "bee1066160c0424696d9bf99ca0645e3",
          key: "f5b72bf3b89b9848de5616f37de040b7",
        },
        category: "movies",
      },
      {
        name: "Celestial Movies Pinoy",
        manifest: "https://qp-pldt-live-grp-01-prod.akamaized.net/out/u/celmovie_pinoy_sd.mpd",
        drm: {
          type: "clearkey",
          keyId: "0f8537d8412b11edb8780242ac120002",
          key: "2ffd7230416150fd5196fd7ea71c36f3",
        },
        category: "movies",
      },
      {
        name: "HITS Movies",
        manifest: "https://qp-pldt-live-grp-12-prod.akamaized.net/out/u/dr_hitsmovies.mpd",
        drm: {
          type: "clearkey",
          keyId: "f56b57b32d7e4b2cb21748c0b56761a7",
          key: "3df06a89aa01b32655a77d93e09e266f",
        },
        category: "movies",
      },

      // News
      {
        name: "Bilyonaryo Channel",
        manifest: "https://qp-pldt-live-grp-05-prod.akamaized.net/out/u/bilyonaryoch.mpd",
        drm: {
          type: "clearkey",
          keyId: "227ffaf09bec4a889e0e0988704d52a2",
          key: "b2d0dce5c486891997c1c92ddaca2cd2",
        },
        category: "news",
      },
      {
        name: "One News",
        manifest: "https://qp-pldt-live-grp-04-prod.akamaized.net/out/u/onenews_hd1.mpd",
        drm: {
          type: "clearkey",
          keyId: "d39eb201ae494a0b98583df4d110e8dd",
          key: "6797066880d344422abd3f5eda41f45f",
        },
        category: "news",
      },
      {
        name: "RPTV",
        manifest: "https://qp-pldt-live-grp-03-prod.akamaized.net/out/u/cnn_rptv_prod_hd.mpd",
        drm: {
          type: "clearkey",
          keyId: "1917f4caf2364e6d9b1507326a85ead6",
          key: "a1340a251a5aa63a9b0ea5d9d7f67595",
        },
        category: "news",
      },
      {
        name: "CNN Philippines",
        manifest: "https://qp-pldt-live-grp-03-prod.akamaized.net/out/u/cg_cnnhd.mpd",
        drm: {
          type: "clearkey",
          keyId: "900c43f0e02742dd854148b7a75abbec",
          key: "da315cca7f2902b4de23199718ed7e90",
        },
        category: "news",
      },
      {
        name: "BBC News",
        manifest: "https://qp-pldt-live-grp-04-prod.akamaized.net/out/u/bbcworld_news_sd.mpd",
        drm: {
          type: "clearkey",
          keyId: "f59650be475e4c34a844d4e2062f71f3",
          key: "119639e849ddee96c4cec2f2b6b09b40",
        },
        category: "news",
      },
      {
        name: "Bloomberg",
        manifest: "https://qp-pldt-live-grp-09-prod.akamaized.net/out/u/bloomberg_sd.mpd",
        drm: {
          type: "clearkey",
          keyId: "ef7d9dcfb99b406cb79fb9f675cba426",
          key: "b24094f6ca136af25600e44df5987af4",
        },
        category: "news",
      },
      {
        name: "ABC Australia",
        manifest: "https://qp-pldt-live-grp-10-prod.akamaized.net/out/u/dr_abc_aus.mpd",
        drm: {
          type: "clearkey",
          keyId: "389497f9f8584a57b234e27e430e04b7",
          key: "3b85594c7f88604adf004e45c03511c0",
        },
        category: "news",
      },
      {
        name: "Channel News Asia",
        manifest: "https://qp-pldt-live-grp-13-prod.akamaized.net/out/u/dr_channelnewsasia.mpd",
        drm: {
          type: "clearkey",
          keyId: "b259df9987364dd3b778aa5d42cb9acd",
          key: "753e3dba96ab467e468269e7e33fb813",
        },
        category: "news",
      },
      {
        name: "CNN International",
        manifest: "https://qp-pldt-live-grp-12-prod.akamaized.net/out/u/dr_cnnhd.mpd",
        drm: {
          type: "clearkey",
          keyId: "900c43f0e02742dd854148b7a75abbec",
          key: "da315cca7f2902b4de23199718ed7e90",
        },
        category: "news",
      },
      {
        name: "France24",
        manifest: "https://qp-pldt-live-grp-11-prod.akamaized.net/out/u/dr_france24.mpd",
        drm: {
          type: "clearkey",
          keyId: "257f9fdeb39d41bdb226c2ae1fbdaeb6",
          key: "e80ead0f4f9d6038ab34f332713ceaa5",
        },
        category: "news",
      },
      {
        name: "NHK World Japan",
        manifest: "https://qp-pldt-live-grp-12-prod.akamaized.net/out/u/dr_nhk_japan.mpd",
        drm: {
          type: "clearkey",
          keyId: "3d6e9d4de7d7449aadd846b7a684e564",
          key: "0800fff80980f47f7ac6bc60b361b0cf",
        },
        category: "news",
      },

      // Sports
      {
        name: "PBA RUSH",
        manifest: "https://qp-pldt-live-grp-01-prod.akamaized.net/out/u/cg_pbarush_hd1.mpd",
        drm: {
          type: "clearkey",
          keyId: "76dc29dd87a244aeab9e8b7c5da1e5f3",
          key: "95b2f2ffd4e14073620506213b62ac82",
        },
        category: "sports",
      },
      {
        name: "One Sports+",
        manifest: "https://qp-pldt-live-grp-03-prod.akamaized.net/out/u/cg_onesportsplus_hd1.mpd",
        drm: {
          type: "clearkey",
          keyId: "322d06e9326f4753a7ec0908030c13d8",
          key: "1e3e0ca32d421fbfec86feced0efefda",
        },
        category: "sports",
      },
      {
        name: "Tap Sports",
        manifest: "https://qp-pldt-live-grp-11-prod.akamaized.net/out/u/dr_tapsports.mpd",
        drm: {
          type: "clearkey",
          keyId: "eabd2d95c89e42f2b0b0b40ce4179ea0",
          key: "0e7e35a07e2c12822316c0dc4873903f",
        },
        category: "sports",
      },
      {
        name: "UAAP Varsity Channel",
        manifest: "https://qp-pldt-live-grp-04-prod.akamaized.net/out/u/cg_uaap_cplay_sd.mpd",
        drm: {
          type: "clearkey",
          keyId: "95588338ee37423e99358a6d431324b9",
          key: "6e0f50a12f36599a55073868f814e81e",
        },
        category: "sports",
      },
      {
        name: "SPOTV",
        manifest: "https://qp-pldt-live-grp-11-prod.akamaized.net/out/u/dr_spotvhd.mpd",
        drm: {
          type: "clearkey",
          keyId: "ec7ee27d83764e4b845c48cca31c8eef",
          key: "9c0e4191203fccb0fde34ee29999129e",
        },
        category: "sports",
      },
      {
        name: "SPOTV2",
        manifest: "https://qp-pldt-live-grp-13-prod.akamaized.net/out/u/dr_spotv2hd.mpd",
        drm: {
          type: "clearkey",
          keyId: "7eea72d6075245a99ee3255603d58853",
          key: "6848ef60575579bf4d415db1032153ed",
        },
        category: "sports",
      },
      {
        name: "Premier Sports 2",
        manifest: "https://qp-pldt-live-grp-13-prod.akamaized.net/out/u/dr_premiertennishd.mpd",
        drm: {
          type: "clearkey",
          keyId: "59454adb530b4e0784eae62735f9d850",
          key: "61100d0b8c4dd13e4eb8b4851ba192cc",
        },
        category: "sports",
      },
      {
        name: "NBA TV Philippines",
        manifest: "https://qp-pldt-live-grp-02-prod.akamaized.net/out/u/pl_nba.mpd",
        drm: {
          type: "clearkey",
          keyId: "f36eed9e95f140fabbc88a08abbeafff",
          key: "0125600d0eb13359c28bdab4a2ebe75a",
        },
        category: "sports",
      },

      // Entertainment
      {
        name: "TV5",
        manifest: "https://qp-pldt-live-grp-02-prod.akamaized.net/out/u/tv5_hd.mpd",
        drm: {
          type: "clearkey",
          keyId: "2615129ef2c846a9bbd43a641c7303ef",
          key: "07c7f996b1734ea288641a68e1cfdc4d",
        },
        category: "entertainment",
      },
      {
        name: "A2Z",
        manifest: "https://qp-pldt-live-grp-02-prod.akamaized.net/out/u/cg_a2z.mpd",
        drm: {
          type: "clearkey",
          keyId: "f703e4c8ec9041eeb5028ab4248fa094",
          key: "c22f2162e176eee6273a5d0b68d19530",
        },
        category: "entertainment",
      },
      {
        name: "TVUP!",
        manifest: "https://qp-pldt-live-grp-09-prod.akamaized.net/out/u/tvup_prd.mpd",
        drm: {
          type: "clearkey",
          keyId: "83e813ccd4ca4837afd611037af02f63",
          key: "a97c515dbcb5dcbc432bbd09d15afd41",
        },
        category: "entertainment",
      },
      {
        name: "Rock Action",
        manifest: "https://qp-pldt-live-grp-13-prod.akamaized.net/out/u/dr_rockextreme.mpd",
        drm: {
          type: "clearkey",
          keyId: "0f852fb8412b11edb8780242ac120002",
          key: "4cbc004d8c444f9f996db42059ce8178",
        },
        category: "entertainment",
      },
      {
        name: "Tap TV",
        manifest: "https://qp-pldt-live-grp-06-prod.akamaized.net/out/u/cg_taptv_sd.mpd",
        drm: {
          type: "clearkey",
          keyId: "f6804251e90b4966889b7df94fdc621e",
          key: "55c3c014f2bd12d6bd62349658f24566",
        },
        category: "entertainment",
      },
      {
        name: "Knowledge Channel",
        manifest: "https://qp-pldt-live-grp-13-prod.akamaized.net/out/u/dr_knowledgechannel.mpd",
        drm: {
          type: "clearkey",
          keyId: "0f856fa0412b11edb8780242ac120002",
          key: "783374273ef97ad3bc992c1d63e091e7",
        },
        category: "entertainment",
      },
      {
        name: "DepEd TV",
        manifest: "https://qp-pldt-live-grp-07-prod.akamaized.net/out/u/depedch_sd.mpd",
        drm: {
          type: "clearkey",
          keyId: "0f853706412b11edb8780242ac120002",
          key: "2157d6529d80a760f60a8b5350dbc4df",
        },
        category: "entertainment",
      },
      {
        name: "Fashion TV",
        manifest: "https://qp-pldt-live-grp-11-prod.akamaized.net/out/u/dr_fashiontvhd.mpd",
        drm: {
          type: "clearkey",
          keyId: "971ebbe2d887476398e97c37e0c5c591",
          key: "472aa631b1e671070a4bf198f43da0c7",
        },
        category: "entertainment",
      },
      {
        name: "KIX",
        manifest: "https://qp-pldt-live-grp-06-prod.akamaized.net/out/u/kix_hd1.mpd",
        drm: {
          type: "clearkey",
          keyId: "a8d5712967cd495ca80fdc425bc61d6b",
          key: "f248c29525ed4c40cc39baeee9634735",
        },
        category: "entertainment",
      },
      {
        name: "Warner TV",
        manifest: "https://qp-pldt-live-grp-11-prod.akamaized.net/out/u/dr_warnertvhd.mpd",
        drm: {
          type: "clearkey",
          keyId: "4503cf86bca3494ab95a77ed913619a0",
          key: "afc9c8f627fb3fb255dee8e3b0fe1d71",
        },
        category: "entertainment",
      },
      {
        name: "HITS",
        manifest: "https://qp-pldt-live-grp-04-prod.akamaized.net/out/u/hits_hd1.mpd",
        drm: {
          type: "clearkey",
          keyId: "dac605bc197e442c93f4f08595a95100",
          key: "975e27ffc1b7949721ee3ccb4b7fd3e5",
        },
        category: "entertainment",
      },
      {
        name: "tvN Premium",
        manifest: "https://qp-pldt-live-grp-09-prod.akamaized.net/out/u/cg_tvnpre.mpd",
        drm: {
          type: "clearkey",
          keyId: "e1bde543e8a140b38d3f84ace746553e",
          key: "b712c4ec307300043333a6899a402c10",
        },
        category: "entertainment",
      },
      {
        name: "History",
        manifest: "https://qp-pldt-live-grp-11-prod.akamaized.net/out/u/dr_historyhd.mpd",
        drm: {
          type: "clearkey",
          keyId: "a7724b7ca2604c33bb2e963a0319968a",
          key: "6f97e3e2eb2bade626e0281ec01d3675",
        },
        category: "entertainment",
      },
      {
        name: "BBC Earth",
        manifest: "https://qp-pldt-live-grp-03-prod.akamaized.net/out/u/cg_bbcearth_hd1.mpd",
        drm: {
          type: "clearkey",
          keyId: "34ce95b60c424e169619816c5181aded",
          key: "0e2a2117d705613542618f58bf26fc8e",
        },
        category: "entertainment",
      },
      {
        name: "TrueFM TV",
        manifest: "https://qp-pldt-live-grp-08-prod.akamaized.net/out/u/truefm_tv.mpd",
        drm: {
          type: "clearkey",
          keyId: "0559c95496d44fadb94105b9176c3579",
          key: "40d8bb2a46ffd03540e0c6210ece57ce",
        },
        category: "entertainment",
      },
      {
        name: "TV Maria",
        manifest: "https://qp-pldt-live-grp-07-prod.akamaized.net/out/u/tvmaria_prd.mpd",
        drm: {
          type: "clearkey",
          keyId: "fa3998b9a4de40659725ebc5151250d6",
          key: "998f1294b122bbf1a96c1ddc0cbb229f",
        },
        category: "entertainment",
      },
      {
        name: "Rock Entertainment",
        manifest: "https://qp-pldt-live-grp-13-prod.akamaized.net/out/u/dr_rockentertainment.mpd",
        drm: {
          type: "clearkey",
          keyId: "e4ee0cf8ca9746f99af402ca6eed8dc7",
          key: "be2a096403346bc1d0bb0f812822bb62",
        },
        category: "entertainment",
      },
      {
        name: "Lifetime",
        manifest: "https://qp-pldt-live-grp-11-prod.akamaized.net/out/u/dr_lifetime.mpd",
        drm: {
          type: "clearkey",
          keyId: "cf861d26e7834166807c324d57df5119",
          key: "64a81e30f6e5b7547e3516bbf8c647d0",
        },
        category: "entertainment",
      },
      {
        name: "Food Network",
        manifest: "https://qp-pldt-live-grp-09-prod.akamaized.net/out/u/cg_foodnetwork_hd1.mpd",
        drm: {
          type: "clearkey",
          keyId: "b7299ea0af8945479cd2f287ee7d530e",
          key: "b8ae7679cf18e7261303313b18ba7a14",
        },
        category: "entertainment",
      },
      {
        name: "AXN",
        manifest: "https://qp-pldt-live-grp-06-prod.akamaized.net/out/u/cg_axn_sd.mpd",
        drm: {
          type: "clearkey",
          keyId: "fd5d928f5d974ca4983f6e9295dfe410",
          key: "3aaa001ddc142fedbb9d5557be43792f",
        },
        category: "entertainment",
      },
      {
        name: "Travel Channel",
        manifest: "https://qp-pldt-live-grp-08-prod.akamaized.net/out/u/travel_channel_sd.mpd",
        drm: {
          type: "clearkey",
          keyId: "f3047fc13d454dacb6db4207ee79d3d3",
          key: "bdbd38748f51fc26932e96c9a2020839",
        },
        category: "entertainment",
      },
      {
        name: "Cartoon Network",
        manifest: "https://qp-pldt-live-grp-12-prod.akamaized.net/out/u/dr_cartoonnetworkhd.mpd",
        drm: {
          type: "clearkey",
          keyId: "a2d1f552ff9541558b3296b5a932136b",
          key: "cdd48fa884dc0c3a3f85aeebca13d444",
        },
        category: "entertainment",
      },
      {
        name: "HITS Now",
        manifest: "https://qp-pldt-live-grp-09-prod.akamaized.net/out/u/cg_hitsnow.mpd",
        drm: {
          type: "clearkey",
          keyId: "14439a1b7afc4527bb0ebc51cf11cbc1",
          key: "92b0287c7042f271b266cc11ab7541f1",
        },
        category: "entertainment",
      },
      {
        name: "Lotus Macao",
        manifest: "https://qp-pldt-live-grp-07-prod.akamaized.net/out/u/lotusmacau_prd.mpd",
        drm: {
          type: "clearkey",
          keyId: "60dc692e64ea443a8fb5ac186c865a9b",
          key: "01bdbe22d59b2a4504b53adc2f606cc1",
        },
        category: "entertainment",
      },
      {
        name: "BBC Lifestyle",
        manifest: "https://qp-pldt-live-grp-09-prod.akamaized.net/out/u/cg_bbclifestyle.mpd",
        drm: {
          type: "clearkey",
          keyId: "34880f56627c11ee8c990242ac120002",
          key: "c23677c829bb244b79a3dc09ffd88ca0",
        },
        category: "entertainment",
      },
      {
        name: "Discovery Channel",
        manifest: "https://qp-pldt-live-grp-13-prod.akamaized.net/out/u/dr_discovery.mpd",
        drm: {
          type: "clearkey",
          keyId: "d9ac48f5131641a789328257e778ad3a",
          key: "b6e67c37239901980c6e37e0607ceee6",
        },
        category: "entertainment",
      },
      {
        name: "Arirang",
        manifest: "https://qp-pldt-live-grp-01-prod.akamaized.net/out/u/arirang_sd.mpd",
        drm: {
          type: "clearkey",
          keyId: "13815d0fa026441ea7662b0c9de00bcf",
          key: "2d99a55743677c3879a068dd9c92f824",
        },
        category: "entertainment",
      },
      {
        name: "Animal Planet",
        manifest: "https://qp-pldt-live-grp-02-prod.akamaized.net/out/u/cg_animal_planet_sd.mpd",
        drm: {
          type: "clearkey",
          keyId: "436b69f987924fcbbc06d40a69c2799a",
          key: "c63d5b0d7e52335b61aeba4f6537d54d",
        },
        category: "entertainment",
      },
      {
        name: "KBS World",
        manifest: "https://qp-pldt-live-grp-12-prod.akamaized.net/out/u/dr_kbsworld.mpd",
        drm: {
          type: "clearkey",
          keyId: "22ff2347107e4871aa423bea9c2bd363",
          key: "c6e7ba2f48b3a3b8269e8bc360e60404",
        },
        category: "entertainment",
      },
      {
        name: "THRILL",
        manifest: "https://qp-pldt-live-grp-06-prod.akamaized.net/out/u/cg_thrill_sd.mpd",
        drm: {
          type: "clearkey",
          keyId: "928114ffb2394d14b5585258f70ed183",
          key: "a82edc340bc73447bac16cdfed0a4c62",
        },
        category: "entertainment",
      },

      // Kids
      {
        name: "DreamWorks (Tagalized)",
        manifest: "https://qp-pldt-live-grp-07-prod.akamaized.net/out/u/cg_dreamworktag.mpd",
        drm: {
          type: "clearkey",
          keyId: "564b3b1c781043c19242c66e348699c5",
          key: "d3ad27d7fe1f14fb1a2cd5688549fbab",
        },
        category: "kids",
      },
      {
        name: "Moonbug Kids",
        manifest: "https://qp-pldt-live-grp-06-prod.akamaized.net/out/u/cg_moonbug_kids_sd.mpd",
        drm: {
          type: "clearkey",
          keyId: "0bf00921bec94a65a124fba1ef52b1cd",
          key: "0f1488487cbe05e2badc3db53ae0f29f",
        },
        category: "kids",
      },
      {
        name: "CBeebies",
        manifest: "https://linearjitp-playback.astro.com.my/dash-wv/linear/5093/default_ott.mpd",
        drm: {
          type: "clearkey",
          keyId: "50c699c444e5f80dacafc4c99667d810",
          key: "de6c5feaae5f6963b4b392ddc8b6a778",
        },
        category: "kids",
      },

      // Global/International
      {
        name: "Kapamilya Channel",
        manifest: "https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg01006-abs-cbn-kapcha-dash-abscbnono/index.mpd",
        drm: {
          type: "clearkey",
          keyId: "bd17afb5dc9648a39be79ee3634dd4b8",
          key: "3ecf305d54a7729299b93a3d69c02ea5",
        },
        category: "entertainment",
      },
    ].map((channel, index) => {
      // Ensure all channels have required properties
      if (!channel.id) {
        channel.id = index + 1
      }
      if (!channel.drm) channel.drm = null
      if (!channel.image) channel.image = null
      if (!channel.status) channel.status = "untested"
      if (!channel.epgId) channel.epgId = generateChannelId(channel.name)
      return channel
    })

    this.channels = defaultChannelList
  }

  /* manual / TXT import */
  async loadChannelsFromTxtFile(file) {
    try {
      const text = await file.text()
      this.parseChannelsTxt(text)
      this.renderChannels()
    } catch (err) {
      console.error(err)
    }
  }

  parseChannelsTxt(txt) {
    const lines = txt
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
    this.channels = []
    let c = {},
      id = 1
    for (const line of lines) {
      if (line.startsWith("#")) {
        c = { id: id++, name: line.slice(1).trim(), status: "untested", category: this.detectCat(line) }
      } else if (line.includes(".mpd")) {
        c.url = line
      } else if (line.includes(":") && line.length > 20) {
        c.drmKey = line
      }
      if (c.name && c.url && c.drmKey) {
        this.channels.push({ ...c, epgId: this.slug(c.name) })
        c = {}
      }
    }
  }

  detectCat(name) {
    const n = name.toLowerCase()
    if (/(news|cnn|bbc)/.test(n)) return "news"
    if (/(sport|espn|nba|pba)/.test(n)) return "sports"
    if (/(movie|cinema|hbo)/.test(n)) return "movies"
    return "entertainment"
  }

  slug(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  }

  /* ==== RENDER ==== */
  renderChannels() {
    const list = this.filteredChannels()
    const workingCount = this.channels.filter((c) => c.status === "working").length
    this.channelsCountLbl.textContent = `${list.length} channels • ★ ${workingCount} working`

    if (!list.length) {
      this.channelsList.innerHTML = '<p class="no-channels">No channels found</p>'
      return
    }

    this.channelsList.innerHTML = list
      .map(
        (ch, i) => `
      <div class="channel-item ${this.currentChannel?.id === ch.id ? "active" : ""}" 
           onclick="app.selectChannel(${ch.id})">
        <span class="channel-number">${i + 1}</span>
        <div class="channel-status status-${ch.status}" title="Status: ${ch.status}"></div>
        <div class="channel-info">
          <div class="channel-name">${ch.name} ${ch.drm?.type === "widevine" ? "🔐" : ""}</div>
          <div class="channel-category">${this.prettyCat(ch.category)}</div>
        </div>
        <div class="channel-actions">
          <button class="favorite-btn ${this.favorites.has(ch.id) ? "active" : ""}"
                  title="Toggle favorite"
                  onclick="app.toggleFavorite(event,${ch.id})">⭐</button>
        </div>
      </div>`,
      )
      .join("")
  }

  prettyCat(cat) {
    return (
      {
        movies: "Movies",
        news: "News",
        sports: "Sports",
        entertainment: "Entertainment",
        favorites: "⭐ Favorites",
        kids: "👶 Kids",
        beta: "🧪 Beta Channels",
      }[cat] || cat
    )
  }

  filteredChannels() {
    let arr = [...this.channels]
    if (this.currentCategory === "favorites") arr = arr.filter((c) => this.favorites.has(c.id))
    else if (this.currentCategory !== "all") arr = arr.filter((c) => c.category === this.currentCategory)
    const term = this.searchInput.value.trim().toLowerCase()
    if (term) arr = arr.filter((c) => c.name.toLowerCase().includes(term))
    return arr
  }

  /* ==== PLAYBACK ==== */
  async selectChannel(id) {
    const ch = this.channels.find((c) => c.id === id)
    if (!ch) return

    this.currentChannel = ch
    this.renderChannels()
    this.showLoading()

    // Ensure video is unmuted
    this.video.muted = false

    // Set up buffering timeout
    let bufferingTimeout = null
    let hasShownBufferingError = false

    const showBufferingError = () => {
      if (!hasShownBufferingError) {
        hasShownBufferingError = true
        this.hideLoading()
        ch.status = "broken"
        this.renderChannels()
      }
    }

    // Start buffering timeout (15 seconds)
    bufferingTimeout = setTimeout(showBufferingError, 15000)

    try {
      // Configure DRM based on channel type
      if (ch.drm && ch.drm.type === "widevine") {
        // Configure Widevine DRM
        this.player.configure({
          drm: {
            servers: {
              "com.widevine.alpha": ch.drm.licenseUri,
            },
          },
        })
      } else if (ch.drm && ch.drm.type === "clearkey") {
        // Configure clear keys
        this.player.configure({
          drm: {
            clearKeys: { [ch.drm.keyId]: ch.drm.key },
          },
        })
      } else {
        // Clear any previous DRM configuration for non-DRM channels
        this.player.configure({
          drm: {
            clearKeys: {},
            servers: {},
          },
        })
      }

      // Load the stream using manifest property
      await this.player.load(ch.manifest)

      // Clear the buffering timeout since loading succeeded
      if (bufferingTimeout) {
        clearTimeout(bufferingTimeout)
        bufferingTimeout = null
      }

      // Don't show error if we already showed buffering error
      if (hasShownBufferingError) return

      // Set up video event listeners for buffering detection
      const handleCanPlay = () => {
        if (bufferingTimeout) {
          clearTimeout(bufferingTimeout)
          bufferingTimeout = null
        }
        if (!hasShownBufferingError) {
          ch.status = "working"
          this.hideLoading()
          this.renderChannels()
        }
        this.video.removeEventListener("canplay", handleCanPlay)
        this.video.removeEventListener("playing", handlePlaying)
      }

      const handlePlaying = () => {
        if (bufferingTimeout) {
          clearTimeout(bufferingTimeout)
          bufferingTimeout = null
        }
        if (!hasShownBufferingError) {
          ch.status = "working"
          this.hideLoading()
          this.renderChannels()
        }
        this.video.removeEventListener("canplay", handleCanPlay)
        this.video.removeEventListener("playing", handlePlaying)
      }

      // Add event listeners
      this.video.addEventListener("canplay", handleCanPlay)
      this.video.addEventListener("playing", handlePlaying)

      // Try to autoplay with sound
      try {
        this.video.muted = false
        await this.video.play()
      } catch (playError) {
        console.warn("Autoplay with sound failed, trying muted autoplay:", playError)
        try {
          this.video.muted = true
          await this.video.play()
          const unmute = () => {
            this.video.muted = false
            document.removeEventListener("click", unmute)
          }
          document.addEventListener("click", unmute)
        } catch (mutedPlayError) {
          console.warn("Even muted autoplay failed:", mutedPlayError)
        }
        if (!hasShownBufferingError) {
          ch.status = "working"
          this.hideLoading()
          this.renderChannels()
        }
      }
    } catch (err) {
      console.error("Channel load error:", err)
      if (bufferingTimeout) {
        clearTimeout(bufferingTimeout)
        bufferingTimeout = null
      }
      if (!hasShownBufferingError) {
        ch.status = "broken"
        this.hideLoading()
        this.renderChannels()
      }
    }
  }

  /* ==== TEST ALL ==== */
  async testAllChannels() {
    if (this.testingInProgress) return
    this.testingInProgress = true
    this.testAllBtn.disabled = true
    this.testAllBtn.textContent = "Testing…"
    document.getElementById("testProgress").style.display = "block"

    const total = this.channels.length
    let done = 0

    for (const ch of this.channels) {
      ch.status = "testing"
      this.renderChannels()
      this.testStatus.textContent = `Testing ${ch.name}... (${done + 1}/${total})`

      try {
        await this.quickTest(ch)
        ch.status = "working"
      } catch (e) {
        ch.status = "offline"
      }

      done++
      this.progressFill.style.width = `${(done / total) * 100}%`
      this.renderChannels()

      // Small delay to prevent overwhelming
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    const workingCount = this.channels.filter((c) => c.status === "working").length
    const offlineCount = this.channels.filter((c) => c.status === "offline").length

    alert(`Testing Complete!\n\nWorking: ${workingCount}\nOffline: ${offlineCount}`)

    this.testAllBtn.disabled = false
    this.testAllBtn.textContent = "Test All Channels"
    this.testingInProgress = false
    document.getElementById("testProgress").style.display = "none"
  }

  quickTest(ch) {
    return new Promise((res, rej) => {
      const vid = document.createElement("video")
      vid.muted = true
      const p = new window.shaka.Player(vid)

      const t = setTimeout(() => {
        p.destroy()
        rej()
      }, 15000)

      // Configure DRM for testing
      if (ch.drm && ch.drm.type === "widevine") {
        p.configure({
          drm: {
            servers: {
              "com.widevine.alpha": ch.drm.licenseUri,
            },
          },
        })
      } else if (ch.drm && ch.drm.type === "clearkey") {
        p.configure({
          drm: {
            clearKeys: { [ch.drm.keyId]: ch.drm.key },
          },
        })
      }

      p.load(ch.manifest)
        .then(() => {
          const handleCanPlay = () => {
            clearTimeout(t)
            p.destroy()
            res()
          }

          vid.addEventListener("canplay", handleCanPlay)

          setTimeout(() => {
            vid.removeEventListener("canplay", handleCanPlay)
            clearTimeout(t)
            p.destroy()
            res()
          }, 5000)
        })
        .catch(() => {
          clearTimeout(t)
          p.destroy()
          rej()
        })
    })
  }

  /* ==== FAVORITES ==== */
  toggleFavorite(ev, id) {
    ev.stopPropagation()
    if (this.favorites.has(id)) this.favorites.delete(id)
    else this.favorites.add(id)
    localStorage.setItem("shakatv:favorites", JSON.stringify([...this.favorites]))
    this.renderChannels()
  }

  /* ==== HELPERS ==== */
  showLoading() {
    this.loadingSpinner.style.display = "block"
  }
  hideLoading() {
    this.loadingSpinner.style.display = "none"
  }
}

/* global accessor for inline onclick handlers */
window.app = new ShakaTV()

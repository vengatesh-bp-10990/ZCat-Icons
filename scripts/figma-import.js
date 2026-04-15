#!/usr/bin/env node
/**
 * Figma → ZCat Icons batch importer
 * Connects to the Figma MCP server, exports SVGs, normalizes them, and uploads to the app.
 */

const http = require("http");
const https = require("https");
const { EventEmitter } = require("events");

const MCP_BASE = "http://127.0.0.1:3845";
const APP_BASE = "http://127.0.0.1:3000";

// All icons parsed from Figma metadata
const ICONS = [
  { id: "797:4473", name: "activity" },
  { id: "797:4475", name: "activity-heart" },
  { id: "797:4477", name: "anchor" },
  { id: "797:4479", name: "archive" },
  { id: "797:4481", name: "bookmark" },
  { id: "797:4483", name: "bookmark-add" },
  { id: "797:4485", name: "bookmark-check" },
  { id: "797:4487", name: "bookmark-minus" },
  { id: "797:4489", name: "bookmark-x" },
  { id: "797:4491", name: "building-01" },
  { id: "797:4493", name: "building-02" },
  { id: "797:4495", name: "check" },
  { id: "797:4497", name: "check-circle" },
  { id: "797:4499", name: "check-circle-broken" },
  { id: "797:4501", name: "check-heart" },
  { id: "797:4503", name: "check-square" },
  { id: "797:4505", name: "check-square-broken" },
  { id: "797:4507", name: "check-verified-02" },
  { id: "797:4509", name: "cloud-blank-01" },
  { id: "797:4511", name: "copy-02" },
  { id: "797:4513", name: "dots-grid" },
  { id: "797:4515", name: "dots-horizontal" },
  { id: "797:4517", name: "dots-vertical" },
  { id: "797:4519", name: "download-01" },
  { id: "797:4521", name: "download-03" },
  { id: "797:4523", name: "share-05" },
  { id: "797:4525", name: "share-06" },
  { id: "797:4527", name: "share-07" },
  { id: "797:4529", name: "slash-circle-01" },
  { id: "797:4531", name: "tool-01" },
  { id: "797:4533", name: "trash-02" },
  { id: "797:4535", name: "trash-03" },
  { id: "797:4537", name: "upload-01" },
  { id: "797:4539", name: "upload-cloud-01" },
  { id: "797:4541", name: "virus" },
  { id: "797:4543", name: "x-circle" },
  { id: "797:4545", name: "x" },
  { id: "797:4547", name: "zap" },
  { id: "797:4549", name: "link-broken-01" },
  { id: "797:4551", name: "link-external-01" },
  { id: "797:4553", name: "loading-02" },
  { id: "797:4555", name: "log-in-01" },
  { id: "797:4557", name: "log-out-01" },
  { id: "797:4559", name: "minus" },
  { id: "797:4561", name: "minus-circle" },
  { id: "797:4563", name: "percent-01" },
  { id: "797:4565", name: "pin-02" },
  { id: "797:4567", name: "plus" },
  { id: "797:4569", name: "plus-circle" },
  { id: "797:4571", name: "save-01" },
  { id: "797:4573", name: "search-md" },
  { id: "797:4575", name: "search-refraction" },
  { id: "797:4577", name: "settings-01" },
  { id: "797:4579", name: "settings-02" },
  { id: "797:4581", name: "share-02" },
  { id: "797:4583", name: "download-cloud-01" },
  { id: "797:4585", name: "edit-01" },
  { id: "797:4587", name: "edit-03" },
  { id: "797:4589", name: "edit-05" },
  { id: "797:4591", name: "eye" },
  { id: "797:4593", name: "eye-off" },
  { id: "797:4595", name: "filter-funnel-02" },
  { id: "797:4597", name: "google-chrome" },
  { id: "797:4599", name: "heart" },
  { id: "797:4601", name: "help-circle" },
  { id: "797:4603", name: "home-02" },
  { id: "797:4605", name: "info-circle" },
  { id: "797:4607", name: "life-buoy-01" },
  { id: "797:4609", name: "link-01" },
  { id: "797:4611", name: "link-03" },
  { id: "797:4613", name: "arrow-narrow-down" },
  { id: "797:4615", name: "arrow-narrow-down-left" },
  { id: "797:4617", name: "arrow-narrow-down-right" },
  { id: "797:4619", name: "arrow-narrow-left" },
  { id: "797:4621", name: "arrow-narrow-right" },
  { id: "797:4623", name: "arrow-narrow-up" },
  { id: "797:4625", name: "arrow-narrow-up-left" },
  { id: "797:4627", name: "arrow-narrow-up-right" },
  { id: "797:4629", name: "chevron-down" },
  { id: "797:4631", name: "chevron-down-double" },
  { id: "797:4633", name: "chevron-left" },
  { id: "797:4635", name: "chevron-left-double" },
  { id: "797:4637", name: "chevron-right" },
  { id: "797:4639", name: "chevron-right-double" },
  { id: "797:4641", name: "chevron-up" },
  { id: "797:4643", name: "chevron-up-double" },
  { id: "797:4645", name: "corner-down-left" },
  { id: "797:4647", name: "corner-down-right" },
  { id: "797:4649", name: "corner-left-down" },
  { id: "797:4651", name: "corner-left-up" },
  { id: "797:4653", name: "corner-right-down" },
  { id: "797:4655", name: "corner-right-up" },
  { id: "797:4657", name: "corner-up-left" },
  { id: "797:4659", name: "corner-up-right" },
  { id: "797:4661", name: "expand-04" },
  { id: "797:4663", name: "flip-backward" },
  { id: "797:4665", name: "flip-forward" },
  { id: "797:4667", name: "refresh-ccw-01" },
  { id: "797:4669", name: "refresh-ccw-02" },
  { id: "797:4671", name: "refresh-cw-01" },
  { id: "797:4673", name: "browser" },
  { id: "797:4675", name: "code-01" },
  { id: "797:4677", name: "code-02" },
  { id: "797:4679", name: "code-browser" },
  { id: "797:4681", name: "database-01" },
  { id: "797:4683", name: "file-code-01" },
  { id: "797:4685", name: "file-code-02" },
  { id: "797:4687", name: "folder-code" },
  { id: "797:4689", name: "puzzle-piece-01" },
  { id: "797:4691", name: "puzzle-piece-02" },
  { id: "797:4693", name: "qr-code-02" },
  { id: "797:4695", name: "server-01" },
  { id: "797:4697", name: "server-03" },
  { id: "797:4699", name: "server-06" },
  { id: "797:4701", name: "terminal" },
  { id: "797:4703", name: "terminal-browser" },
  { id: "797:4705", name: "variable" },
  { id: "797:4707", name: "currency-dollar-circle" },
  { id: "797:4709", name: "currency-pound-circle" },
  { id: "797:4711", name: "currency-rupee-circle" },
  { id: "797:4713", name: "currency-yen-circle" },
  { id: "797:4715", name: "gift-01" },
  { id: "797:4717", name: "receipt" },
  { id: "797:4719", name: "receipt-check" },
  { id: "797:4721", name: "safe" },
  { id: "797:4723", name: "sale-04" },
  { id: "797:4725", name: "shopping-bag-03" },
  { id: "797:4727", name: "tag-01" },
  { id: "797:4729", name: "tag-03" },
  { id: "797:4731", name: "wallet-02" },
  { id: "797:4733", name: "flag-02" },
  { id: "797:4735", name: "globe-01" },
  { id: "797:4737", name: "globe-05" },
  { id: "797:4739", name: "marker-pin-05" },
  { id: "797:4741", name: "marker-pin-06" },
  { id: "797:4743", name: "navigation-pointer-01" },
  { id: "797:4745", name: "navigation-pointer-off-01" },
  { id: "797:4747", name: "plane" },
  { id: "797:4749", name: "rocket-02" },
  { id: "797:4751", name: "route" },
  { id: "797:4753", name: "alarm-clock" },
  { id: "797:4755", name: "alarm-clock-check" },
  { id: "797:4757", name: "alarm-clock-minus" },
  { id: "797:4759", name: "alarm-clock-off" },
  { id: "797:4761", name: "alarm-clock-plus" },
  { id: "797:4763", name: "calendar" },
  { id: "797:4765", name: "calendar-check-01" },
  { id: "797:4767", name: "calendar-check-02" },
  { id: "797:4769", name: "calendar-date" },
  { id: "797:4771", name: "calendar-minus-01" },
  { id: "797:4773", name: "calendar-plus-01" },
  { id: "797:4775", name: "clock" },
  { id: "797:4777", name: "clock-check" },
  { id: "797:4779", name: "clock-fast-forward" },
  { id: "797:4781", name: "clock-plus" },
  { id: "797:4783", name: "clock-rewind" },
  { id: "797:4785", name: "clock-snooze" },
  { id: "797:4787", name: "clock-stopwatch" },
  { id: "797:4789", name: "hourglass-03" },
  { id: "797:4791", name: "clock-refresh" },
  { id: "797:4793", name: "camera-01" },
  { id: "797:4795", name: "camera-lens" },
  { id: "797:4797", name: "camera-off" },
  { id: "797:4799", name: "colors" },
  { id: "797:4801", name: "flash" },
  { id: "797:4803", name: "flash-off" },
  { id: "797:4805", name: "image-check" },
  { id: "797:4807", name: "image-down" },
  { id: "797:4809", name: "image-left" },
  { id: "797:4811", name: "image-plus" },
  { id: "797:4813", name: "image-right" },
  { id: "797:4815", name: "image-up" },
  { id: "797:4817", name: "file-04" },
  { id: "797:4819", name: "file-05" },
  { id: "797:4821", name: "file-07" },
  { id: "797:4823", name: "file-attachment-04" },
  { id: "797:4825", name: "file-check-01" },
  { id: "797:4827", name: "file-check-02" },
  { id: "797:4829", name: "file-download-02" },
  { id: "797:4831", name: "file-heart-02" },
  { id: "797:4833", name: "file-minus-02" },
  { id: "797:4835", name: "file-plus-02" },
  { id: "797:4837", name: "file-plus-03" },
  { id: "797:4839", name: "file-question-02" },
  { id: "797:4841", name: "file-x-02" },
  { id: "797:4843", name: "file-search-02" },
  { id: "797:4845", name: "folder" },
  { id: "797:4847", name: "folder-check" },
  { id: "797:4849", name: "folder-download" },
  { id: "797:4851", name: "folder-lock" },
  { id: "797:4853", name: "folder-minus" },
  { id: "797:4855", name: "folder-plus" },
  { id: "797:4857", name: "folder-question" },
  { id: "797:4859", name: "folder-search" },
  { id: "797:4861", name: "folder-closed" },
  { id: "797:4863", name: "folder-x" },
  { id: "797:4865", name: "paperclip" },
  { id: "797:4867", name: "clipboard" },
  { id: "797:4869", name: "box" },
  { id: "797:4871", name: "user-right-01" },
  { id: "797:4873", name: "users-down" },
  { id: "797:4875", name: "users-edit" },
  { id: "797:4877", name: "user-down-01" },
  { id: "797:4879", name: "users-left" },
  { id: "797:4881", name: "user-up-01" },
  { id: "797:4883", name: "users-minus" },
  { id: "797:4885", name: "user-edit" },
  { id: "797:4887", name: "users-plus" },
  { id: "797:4889", name: "user-left-01" },
  { id: "797:4891", name: "user-x-01" },
  { id: "797:4893", name: "users-right" },
  { id: "797:4895", name: "users-up" },
  { id: "797:4897", name: "user-01" },
  { id: "797:4899", name: "user-minus-01" },
  { id: "797:4901", name: "users-01" },
  { id: "797:4903", name: "users-x" },
  { id: "797:4905", name: "user-plus-01" },
  { id: "797:4907", name: "user-check-01" },
  { id: "797:4909", name: "users-check" },
  { id: "797:4911", name: "alert-circle" },
  { id: "797:4913", name: "bell-02" },
  { id: "797:4915", name: "notification-text" },
  { id: "797:4917", name: "thumbs-down" },
  { id: "797:4919", name: "alert-triangle" },
  { id: "797:4921", name: "thumbs-up" },
  { id: "797:4923", name: "announcement-01" },
  { id: "797:4925", name: "bell-minus" },
  { id: "797:4927", name: "bell-off-01" },
  { id: "797:4929", name: "bell-ringing-04" },
  { id: "797:4931", name: "cube-02" },
  { id: "797:4933", name: "star-02" },
  { id: "797:4935", name: "cube-outline" },
  { id: "797:4937", name: "inbox-01" },
  { id: "797:4939", name: "mail-01" },
  { id: "797:4941", name: "mail-04" },
  { id: "797:4943", name: "message-text-square-01" },
  { id: "797:4945", name: "phone" },
  { id: "797:4947", name: "send-03" },
  { id: "797:4949", name: "airplay" },
  { id: "797:4951", name: "play-circle-start" },
  { id: "797:4953", name: "battery-charging-01" },
  { id: "797:4955", name: "laptop-02" },
  { id: "797:4957", name: "battery-charging-02" },
  { id: "797:4959", name: "lightbulb-01" },
  { id: "797:4961", name: "podcast" },
  { id: "797:4963", name: "battery-empty" },
  { id: "797:4965", name: "lightbulb-02" },
  { id: "797:4967", name: "battery-full" },
  { id: "797:4969", name: "power-02" },
  { id: "797:4971", name: "battery-low" },
  { id: "797:4973", name: "printer" },
  { id: "797:4975", name: "bluetooth-connect" },
  { id: "797:4977", name: "microphone-01" },
  { id: "797:4979", name: "tablet-01" },
  { id: "797:4981", name: "bluetooth-off" },
  { id: "797:4983", name: "bluetooth-on" },
  { id: "797:4985", name: "microphone-off-01" },
  { id: "797:4987", name: "bluetooth-signal" },
  { id: "797:4989", name: "tv-02" },
  { id: "797:4991", name: "chrome-cast" },
  { id: "797:4993", name: "clapperboard" },
  { id: "797:4995", name: "modem-02" },
  { id: "797:4997", name: "repeat-03" },
  { id: "797:4999", name: "disc-02" },
  { id: "797:5001", name: "monitor-02" },
  { id: "797:5003", name: "fast-backward" },
  { id: "797:5005", name: "rss-02" },
  { id: "797:5007", name: "voicemail" },
  { id: "797:5009", name: "fast-forward" },
  { id: "797:5011", name: "shuffle-01" },
  { id: "797:5013", name: "volume-max" },
  { id: "797:5015", name: "film-01" },
  { id: "797:5017", name: "volume-min" },
  { id: "797:5019", name: "mouse" },
  { id: "797:5021", name: "volume-minus" },
  { id: "797:5023", name: "signal-02" },
  { id: "797:5025", name: "volume-plus" },
  { id: "797:5027", name: "music-note-02" },
  { id: "797:5029", name: "signal-03" },
  { id: "797:5031", name: "volume-x" },
  { id: "797:5033", name: "music-note-plus" },
  { id: "797:5035", name: "hard-drive" },
  { id: "797:5037", name: "pause-circle" },
  { id: "797:5039", name: "skip-back" },
  { id: "797:5041", name: "skip-forward" },
  { id: "797:5043", name: "wifi" },
  { id: "797:5045", name: "headphones-02" },
  { id: "797:5047", name: "wifi-off" },
  { id: "797:5049", name: "keyboard-01" },
  { id: "797:5051", name: "sliders-02" },
  { id: "797:5053", name: "youtube" },
  { id: "797:5055", name: "face-id" },
  { id: "797:5057", name: "scan" },
  { id: "797:5059", name: "shield-03" },
  { id: "797:5061", name: "fingerprint-04" },
  { id: "797:5063", name: "file-lock-02" },
  { id: "797:5065", name: "folder-shield" },
  { id: "797:5067", name: "lock-unlocked-01" },
  { id: "797:5069", name: "shield-off" },
  { id: "797:5071", name: "key-01" },
  { id: "797:5073", name: "shield-plus" },
  { id: "797:5075", name: "shield-tick" },
  { id: "797:5077", name: "file-shield-02" },
  { id: "797:5079", name: "lock-01" },
  { id: "797:5081", name: "shield-zap" },
  { id: "797:5083", name: "passcode" },
  { id: "797:5085", name: "fingerprint-01" },
  { id: "797:5087", name: "passcode-lock" },
  { id: "797:5089", name: "align-center" },
  { id: "797:5091", name: "cursor-02" },
  { id: "797:5093", name: "letter-spacing-01" },
  { id: "797:5095", name: "right-indent-02" },
  { id: "797:5097", name: "align-justify" },
  { id: "797:5099", name: "letter-spacing-02" },
  { id: "797:5101", name: "roller-brush" },
  { id: "797:5103", name: "align-left" },
  { id: "797:5105", name: "line-height" },
  { id: "797:5107", name: "scale-01" },
  { id: "797:5109", name: "align-right" },
  { id: "797:5111", name: "attachment-01" },
  { id: "797:5113", name: "cursor-click-01" },
  { id: "797:5115", name: "magic-wand-02" },
  { id: "797:5117", name: "move" },
  { id: "797:5119", name: "bezier-curve-01" },
  { id: "797:5121", name: "delete" },
  { id: "797:5123", name: "dotpoints-01" },
  { id: "797:5125", name: "paint-pour" },
  { id: "797:5127", name: "dotpoints-02" },
  { id: "797:5129", name: "scissors-cut-02" },
  { id: "797:5131", name: "bold-01" },
  { id: "797:5133", name: "drop" },
  { id: "797:5135", name: "paragraph-spacing" },
  { id: "797:5137", name: "dropper" },
  { id: "797:5139", name: "paragraph-wrap" },
  { id: "797:5141", name: "eraser" },
  { id: "797:5143", name: "pen-tool-01" },
  { id: "797:5145", name: "brush-01" },
  { id: "797:5147", name: "pen-tool-02" },
  { id: "797:5149", name: "figma" },
  { id: "797:5151", name: "pen-tool-minus" },
  { id: "797:5153", name: "pen-tool-plus" },
  { id: "797:5155", name: "text-input" },
  { id: "797:5157", name: "hand" },
  { id: "797:5159", name: "transform" },
  { id: "797:5161", name: "code-snippet-01" },
  { id: "797:5163", name: "heading-01" },
  { id: "797:5165", name: "type-01" },
  { id: "797:5167", name: "code-snippet-02" },
  { id: "797:5169", name: "colors-02" },
  { id: "797:5171", name: "command" },
  { id: "797:5173", name: "image-indent-left" },
  { id: "797:5175", name: "perspective-02" },
  { id: "797:5177", name: "type-strikethrough-01" },
  { id: "797:5179", name: "image-indent-right" },
  { id: "797:5181", name: "italic-01" },
  { id: "797:5183", name: "underline-01" },
  { id: "797:5185", name: "contrast-03" },
  { id: "797:5187", name: "crop-01" },
  { id: "797:5189", name: "left-indent-01" },
  { id: "797:5191", name: "reflect-02" },
  { id: "797:5193", name: "zoom-in" },
  { id: "797:5195", name: "cursor-01" },
  { id: "797:5197", name: "left-indent-02" },
  { id: "797:5199", name: "right-indent-01" },
  { id: "797:5201", name: "zoom-out" },
  { id: "797:5203", name: "certificate-01" },
  { id: "797:5205", name: "graduation-hat-02" },
  { id: "797:5207", name: "atom-02" },
  { id: "797:5209", name: "beaker-02" },
  { id: "797:5211", name: "certificate-02" },
  { id: "797:5213", name: "book-closed" },
  { id: "797:5215", name: "ruler" },
  { id: "797:5217", name: "book-open-01" },
  { id: "797:5219", name: "stand" },
  { id: "797:5221", name: "award-03" },
  { id: "797:5223", name: "glasses-02" },
  { id: "797:5225", name: "award-04" },
  { id: "797:5227", name: "trophy-01" },
  { id: "797:5229", name: "briefcase-02" },
  { id: "797:5231", name: "calculator" },
  { id: "797:5233", name: "graduation-hat-01" },
  { id: "1496:24326", name: "moon" },
  { id: "1496:24328", name: "sun" },
];

// Category mapping based on icon names
const CATEGORY_MAP = {
  "General": [
    "activity", "activity-heart", "anchor", "archive", "bookmark", "bookmark-add",
    "bookmark-check", "bookmark-minus", "bookmark-x", "check", "check-circle",
    "check-circle-broken", "check-heart", "check-square", "check-square-broken",
    "check-verified-02", "cloud-blank-01", "copy-02", "dots-grid", "dots-horizontal",
    "dots-vertical", "slash-circle-01", "tool-01", "virus", "x-circle", "x", "zap",
    "loading-02", "minus", "minus-circle", "percent-01", "pin-02", "plus", "plus-circle",
    "save-01", "search-md", "search-refraction", "heart", "help-circle", "info-circle",
    "life-buoy-01", "box", "clipboard", "paperclip", "cube-02", "star-02", "cube-outline",
    "hand", "command", "zoom-in", "zoom-out",
  ],
  "Arrows": [
    "arrow-narrow-down", "arrow-narrow-down-left", "arrow-narrow-down-right",
    "arrow-narrow-left", "arrow-narrow-right", "arrow-narrow-up",
    "arrow-narrow-up-left", "arrow-narrow-up-right", "chevron-down",
    "chevron-down-double", "chevron-left", "chevron-left-double", "chevron-right",
    "chevron-right-double", "chevron-up", "chevron-up-double", "corner-down-left",
    "corner-down-right", "corner-left-down", "corner-left-up", "corner-right-down",
    "corner-right-up", "corner-up-left", "corner-up-right", "expand-04",
    "flip-backward", "flip-forward", "refresh-ccw-01", "refresh-ccw-02",
    "refresh-cw-01", "move",
  ],
  "Files and Folders": [
    "file-04", "file-05", "file-07", "file-attachment-04", "file-check-01",
    "file-check-02", "file-code-01", "file-code-02", "file-download-02",
    "file-heart-02", "file-minus-02", "file-plus-02", "file-plus-03",
    "file-question-02", "file-x-02", "file-search-02", "file-lock-02",
    "file-shield-02", "folder", "folder-check", "folder-download", "folder-lock",
    "folder-minus", "folder-plus", "folder-question", "folder-search",
    "folder-closed", "folder-x", "folder-code", "folder-shield",
  ],
  "Communication": [
    "inbox-01", "mail-01", "mail-04", "message-text-square-01", "phone",
    "send-03", "notification-text", "announcement-01",
  ],
  "Users": [
    "user-right-01", "users-down", "users-edit", "user-down-01", "users-left",
    "user-up-01", "users-minus", "user-edit", "users-plus", "user-left-01",
    "user-x-01", "users-right", "users-up", "user-01", "user-minus-01",
    "users-01", "users-x", "user-plus-01", "user-check-01", "users-check",
  ],
  "Alerts": [
    "alert-circle", "alert-triangle", "bell-02", "bell-minus", "bell-off-01",
    "bell-ringing-04", "thumbs-down", "thumbs-up",
  ],
  "Actions": [
    "download-01", "download-03", "download-cloud-01", "upload-01",
    "upload-cloud-01", "share-02", "share-05", "share-06", "share-07",
    "trash-02", "trash-03", "edit-01", "edit-03", "edit-05", "eye",
    "eye-off", "filter-funnel-02", "log-in-01", "log-out-01",
    "link-01", "link-03", "link-broken-01", "link-external-01", "delete",
  ],
  "Development": [
    "browser", "code-01", "code-02", "code-browser", "database-01",
    "puzzle-piece-01", "puzzle-piece-02", "qr-code-02", "server-01",
    "server-03", "server-06", "terminal", "terminal-browser", "variable",
    "code-snippet-01", "code-snippet-02",
  ],
  "Commerce": [
    "currency-dollar-circle", "currency-pound-circle", "currency-rupee-circle",
    "currency-yen-circle", "gift-01", "receipt", "receipt-check", "safe",
    "sale-04", "shopping-bag-03", "tag-01", "tag-03", "wallet-02",
  ],
  "Maps": [
    "flag-02", "globe-01", "globe-05", "marker-pin-05", "marker-pin-06",
    "navigation-pointer-01", "navigation-pointer-off-01", "plane", "rocket-02",
    "route", "home-02",
  ],
  "Time": [
    "alarm-clock", "alarm-clock-check", "alarm-clock-minus", "alarm-clock-off",
    "alarm-clock-plus", "calendar", "calendar-check-01", "calendar-check-02",
    "calendar-date", "calendar-minus-01", "calendar-plus-01", "clock",
    "clock-check", "clock-fast-forward", "clock-plus", "clock-rewind",
    "clock-snooze", "clock-stopwatch", "hourglass-03", "clock-refresh",
  ],
  "Media": [
    "camera-01", "camera-lens", "camera-off", "flash", "flash-off",
    "image-check", "image-down", "image-left", "image-plus", "image-right",
    "image-up", "airplay", "play-circle-start", "clapperboard", "disc-02",
    "fast-backward", "fast-forward", "film-01", "music-note-02",
    "music-note-plus", "pause-circle", "podcast", "repeat-03", "shuffle-01",
    "skip-back", "skip-forward", "youtube",
  ],
  "Devices": [
    "battery-charging-01", "battery-charging-02", "battery-empty", "battery-full",
    "battery-low", "bluetooth-connect", "bluetooth-off", "bluetooth-on",
    "bluetooth-signal", "chrome-cast", "hard-drive", "headphones-02",
    "keyboard-01", "laptop-02", "lightbulb-01", "lightbulb-02",
    "microphone-01", "microphone-off-01", "modem-02", "monitor-02", "mouse",
    "power-02", "printer", "rss-02", "signal-02", "signal-03", "sliders-02",
    "tablet-01", "tv-02", "voicemail", "volume-max", "volume-min",
    "volume-minus", "volume-plus", "volume-x", "wifi", "wifi-off",
  ],
  "Security": [
    "face-id", "fingerprint-01", "fingerprint-04", "key-01", "lock-01",
    "lock-unlocked-01", "passcode", "passcode-lock", "scan", "shield-03",
    "shield-off", "shield-plus", "shield-tick", "shield-zap",
  ],
  "Design": [
    "align-center", "align-justify", "align-left", "align-right",
    "attachment-01", "bezier-curve-01", "bold-01", "brush-01", "colors",
    "colors-02", "contrast-03", "crop-01", "cursor-01", "cursor-02",
    "cursor-click-01", "dotpoints-01", "dotpoints-02", "drop", "dropper",
    "eraser", "figma", "google-chrome", "heading-01", "image-indent-left",
    "image-indent-right", "italic-01", "left-indent-01", "left-indent-02",
    "letter-spacing-01", "letter-spacing-02", "line-height", "magic-wand-02",
    "paint-pour", "paragraph-spacing", "paragraph-wrap", "pen-tool-01",
    "pen-tool-02", "pen-tool-minus", "pen-tool-plus", "perspective-02",
    "reflect-02", "right-indent-01", "right-indent-02", "roller-brush",
    "scale-01", "scissors-cut-02", "text-input", "transform",
    "type-01", "type-strikethrough-01", "underline-01",
  ],
  "Education": [
    "atom-02", "award-03", "award-04", "beaker-02", "book-closed",
    "book-open-01", "briefcase-02", "calculator", "certificate-01",
    "certificate-02", "glasses-02", "graduation-hat-01", "graduation-hat-02",
    "ruler", "stand", "trophy-01",
  ],
  "Weather": [
    "moon", "sun",
  ],
  "Buildings": [
    "building-01", "building-02", "settings-01", "settings-02",
  ],
};

// Build reverse map: icon name → category
const nameToCat = {};
for (const [cat, names] of Object.entries(CATEGORY_MAP)) {
  for (const name of names) {
    nameToCat[name] = cat;
  }
}

// Tags based on icon name
function generateTags(name) {
  const parts = name.replace(/-\d+$/, "").split("-");
  const tags = [...new Set(parts.filter((p) => p.length > 1))];
  // Add some semantic tags
  const extras = {
    "trash": ["delete", "remove", "bin"],
    "edit": ["pencil", "write", "modify"],
    "eye": ["view", "visible", "show"],
    "heart": ["love", "favorite", "like"],
    "star": ["favorite", "rating"],
    "bell": ["notification", "alert"],
    "mail": ["email", "message", "envelope"],
    "phone": ["call", "telephone", "mobile"],
    "lock": ["security", "password", "protected"],
    "user": ["person", "account", "profile"],
    "users": ["people", "group", "team"],
    "file": ["document", "paper"],
    "folder": ["directory", "organize"],
    "calendar": ["date", "schedule", "event"],
    "clock": ["time", "schedule"],
    "camera": ["photo", "picture", "capture"],
    "image": ["photo", "picture"],
    "search": ["find", "lookup"],
    "settings": ["gear", "preferences", "config"],
    "shield": ["security", "protection"],
    "download": ["save", "get"],
    "upload": ["send", "publish"],
    "share": ["social", "send"],
    "bookmark": ["save", "favorite"],
    "check": ["success", "done", "complete"],
    "alert": ["warning", "danger"],
    "arrow": ["direction", "navigate"],
    "chevron": ["arrow", "direction", "caret"],
  };
  for (const [key, extra] of Object.entries(extras)) {
    if (name.includes(key)) tags.push(...extra);
  }
  return [...new Set(tags)].slice(0, 6).join(", ");
}

// ── MCP Client ──────────────────────────────────────────────────────

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function httpPost(url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === "https:" ? https : http;
    const req = mod.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, data }));
    });
    req.on("error", reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function connectMCP() {
  // Get SSE session
  const sseData = await httpGet(`${MCP_BASE}/sse`);
  const match = sseData.match(/data:\s*(\/messages\?sessionId=[^\n]+)/);
  if (!match) throw new Error("Failed to get MCP session");
  const messageUrl = `${MCP_BASE}${match[1].trim()}`;

  // Initialize
  const initRes = await httpPost(messageUrl, {
    jsonrpc: "2.0",
    id: 0,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "figma-import", version: "1.0.0" },
    },
  });
  console.log("MCP initialized:", initRes.status);

  return messageUrl;
}

async function callMCPTool(messageUrl, toolName, args, reqId) {
  const res = await httpPost(messageUrl, {
    jsonrpc: "2.0",
    id: reqId,
    method: "tools/call",
    params: { name: toolName, arguments: args },
  });
  return res;
}

// ── SVG Processing ──────────────────────────────────────────────────

function normalizeFigmaSvg(svgString) {
  if (!svgString || !svgString.includes("<svg")) return null;

  // 1. Replace CSS variable colors with solid hex
  let svg = svgString;
  svg = svg.replace(/var\(--[^,]+,\s*([^)]+)\)/g, "$1");

  // 2. Extract original viewBox dimensions
  const vbMatch = svg.match(/viewBox="([^"]+)"/);
  let origW = 16, origH = 16;
  if (vbMatch) {
    const parts = vbMatch[1].split(/\s+/).map(Number);
    if (parts.length === 4) { origW = parts[2]; origH = parts[3]; }
  }

  // 3. Extract everything between <svg> and </svg>
  const innerMatch = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  if (!innerMatch) return null;
  let inner = innerMatch[1].trim();

  // 4. Remove wrapper <g> with just id (preserve other groups)
  inner = inner.replace(/<g\s+id="[^"]*"\s*>/g, "");
  // Balance closing tags
  const openGs = (inner.match(/<g[\s>]/g) || []).length;
  const closeGs = (inner.match(/<\/g>/g) || []).length;
  if (closeGs > openGs) {
    for (let i = 0; i < closeGs - openGs; i++) {
      inner = inner.replace(/<\/g>/, "");
    }
  }

  // 5. Build scaled SVG: wrap inner content in a scale transform
  //    from original size to 24x24
  const scaleX = 24 / origW;
  const scaleY = 24 / origH;
  const scale = Math.min(scaleX, scaleY);

  const scaledSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
<g transform="scale(${scale})">
${inner}
</g>
</svg>`;

  return scaledSvg;
}

// ── Upload to App ───────────────────────────────────────────────────

function uploadToApp(name, svgContent, tags, categoryId) {
  return new Promise((resolve, reject) => {
    const boundary = "----FormBoundary" + Math.random().toString(36).slice(2);
    let body = "";
    body += `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}.svg"\r\nContent-Type: image/svg+xml\r\n\r\n${svgContent}\r\n`;
    body += `--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\n${name}\r\n`;
    body += `--${boundary}\r\nContent-Disposition: form-data; name="tags"\r\n\r\n${tags}\r\n`;
    if (categoryId) body += `--${boundary}\r\nContent-Disposition: form-data; name="category_id"\r\n\r\n${categoryId}\r\n`;
    body += `--${boundary}--\r\n`;

    const req = http.request({
      hostname: "127.0.0.1",
      port: 3000,
      path: "/api/icons/upload?skip_ai=true",
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function createCategory(name) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ name });
    const req = http.request({
      hostname: "127.0.0.1",
      port: 3000,
      path: "/api/categories",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function fetchCategories() {
  return new Promise((resolve, reject) => {
    http.get("http://127.0.0.1:3000/api/categories", (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch { resolve([]); }
      });
    }).on("error", reject);
  });
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🎨 ZCat Icons — Figma Import (Simplified)`);
  console.log(`Found ${ICONS.length} icons to import\n`);

  // Step 1: Create categories
  console.log("📁 Creating categories...");
  const existingCats = await fetchCategories();
  const catMap = {};
  for (const cat of existingCats) {
    catMap[cat.name] = cat.ROWID;
  }
  for (const catName of Object.keys(CATEGORY_MAP)) {
    if (!catMap[catName]) {
      const created = await createCategory(catName);
      if (created?.ROWID) {
        catMap[catName] = created.ROWID;
        console.log(`  ✓ Created: ${catName}`);
      }
    } else {
      console.log(`  · Exists: ${catName}`);
    }
  }

  // Step 2: Connect to MCP SSE and process icons
  console.log("\n🔗 Connecting to Figma MCP SSE...");

  const sseUrl = `${MCP_BASE}/sse`;
  let msgEndpoint = null;
  let pendingResolvers = {}; // id → resolve function

  // Connect SSE
  await new Promise((resolve, reject) => {
    http.get(sseUrl, (res) => {
      let buffer = "";
      res.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Keep incomplete line

        let currentEvent = null;
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();

            if (currentEvent === "endpoint") {
              msgEndpoint = `${MCP_BASE}${data}`;
              console.log("  ✓ Got message endpoint");
              resolve();
            } else if (currentEvent === "message") {
              try {
                const msg = JSON.parse(data);
                if (msg.id !== undefined && pendingResolvers[msg.id]) {
                  pendingResolvers[msg.id](msg);
                  delete pendingResolvers[msg.id];
                }
              } catch {}
            }
            currentEvent = null;
          }
        }
      });
      res.on("error", reject);
    }).on("error", reject);
  });

  // Initialize MCP
  console.log("  Initializing MCP session...");
  const initResult = await new Promise((resolve) => {
    pendingResolvers[0] = resolve;
    httpPost(msgEndpoint, {
      jsonrpc: "2.0", id: 0, method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "figma-import", version: "1.0.0" },
      },
    });
  });
  console.log("  ✓ MCP session initialized");

  // Send initialized notification
  await httpPost(msgEndpoint, {
    jsonrpc: "2.0", method: "notifications/initialized",
  });

  // Step 3: Process each icon
  let success = 0, failed = 0;

  for (let i = 0; i < ICONS.length; i++) {
    const icon = ICONS[i];
    const category = nameToCat[icon.name] || "General";
    const categoryId = catMap[category] || "";
    const tags = generateTags(icon.name);
    const reqId = i + 100;

    process.stdout.write(`\r[${i + 1}/${ICONS.length}] ${icon.name.padEnd(30)}  `);

    try {
      // Call get_design_context via MCP
      const toolResult = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          delete pendingResolvers[reqId];
          reject(new Error("timeout"));
        }, 15000);

        pendingResolvers[reqId] = (msg) => {
          clearTimeout(timer);
          resolve(msg);
        };

        httpPost(msgEndpoint, {
          jsonrpc: "2.0", id: reqId,
          method: "tools/call",
          params: {
            name: "get_design_context",
            arguments: { nodeId: icon.id },
          },
        });
      });

      // Extract SVG URL from tool result
      const resultText = toolResult?.result?.content?.[0]?.text || "";
      const urlMatch = resultText.match(/http:\/\/localhost:3845\/assets\/[a-f0-9]+\.svg/);

      if (!urlMatch) {
        console.log(`✗ No SVG URL found`);
        failed++;
        continue;
      }

      // Fetch SVG
      const rawSvg = await httpGet(urlMatch[0]);
      if (!rawSvg || !rawSvg.includes("<svg")) {
        failed++;
        continue;
      }

      // Normalize the SVG to our canonical style
      const normalizedSvg = normalizeFigmaSvg(rawSvg);
      if (!normalizedSvg) {
        failed++;
        continue;
      }

      // Upload to app
      const uploadResult = await uploadToApp(icon.name, normalizedSvg, tags, categoryId);
      if (uploadResult.status === 201) {
        success++;
      } else {
        console.log(`✗ Upload failed: ${uploadResult.status}`);
        failed++;
      }

      // Small delay to avoid overwhelming the MCP server
      await new Promise((r) => setTimeout(r, 100));

    } catch (err) {
      console.log(`✗ ${err.message}`);
      failed++;
    }
  }

  console.log(`\n\n✅ Import complete!`);
  console.log(`   ${success} uploaded successfully`);
  console.log(`   ${failed} failed`);
  console.log(`   Total: ${ICONS.length} icons`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

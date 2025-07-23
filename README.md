# StreamTV - IPTV Player

A modern, web-based IPTV streaming application with support for DRM-protected content and channel testing capabilities.

## Features

- 🎥 **Video Streaming**: Powered by Shaka Player for robust streaming support
- 📺 **Channel Management**: Organize channels by categories (News, Sports, Movies, Entertainment)
- 🔍 **Search & Filter**: Find channels quickly with real-time search
- ✅ **Channel Testing**: Test all channels to verify their status
- 🔐 **DRM Support**: Support for DRM-protected content with clear keys
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🎨 **Modern UI**: Dark theme with smooth animations

## Getting Started

### Prerequisites

- A modern web browser with HTML5 video support
- IPTV channel list in text format

### Installation

1. Clone this repository:
\`\`\`bash
git clone https://github.com/yourusername/streamtv-iptv-player.git
cd streamtv-iptv-player
\`\`\`

2. Open `index.html` in your web browser or serve it using a local web server:
\`\`\`bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .
\`\`\`

3. Navigate to `http://localhost:8000` in your browser

### Channel File Format

Create a text file with your channels in the following format:

\`\`\`
# Channel Name 1
https://example.com/channel1.mpd
keyid1:key1

# Channel Name 2
https://example.com/channel2.mpd
keyid2:key2
\`\`\`

- Lines starting with `#` are treated as channel names
- URLs ending with `.mpd` or starting with `http` are treated as stream URLs
- Lines with `:` and length > 20 are treated as DRM keys (keyid:key format)

### Usage

1. **Load Channels**: Drag and drop your channels text file onto the application
2. **Browse Channels**: Use the sidebar to browse available channels
3. **Search**: Use the search box to find specific channels
4. **Filter by Category**: Click category buttons to filter channels
5. **Test Channels**: Click "Test All Channels" to verify which channels are working
6. **Watch**: Click on any channel to start streaming

## Channel Status Indicators

- 🟢 **Green**: Channel is working
- 🟡 **Yellow**: Channel not tested yet
- 🔴 **Red**: Channel is broken/has errors
- ⚫ **Gray**: Channel is offline

## Browser Compatibility

- Chrome 53+
- Firefox 47+
- Safari 12.1+
- Edge 79+

## Dependencies

- [Shaka Player](https://github.com/shaka-project/shaka-player) - For video streaming and DRM support

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This application is for educational purposes only. Users are responsible for ensuring they have the right to access and stream the content they load into the application.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.

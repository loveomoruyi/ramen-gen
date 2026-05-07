/* Hero Video Sequencer - Smooth looping through multiple videos */
(function() {
    var videoSources = [
        'assets/videos/hero-ramen.mp4',
        'assets/videos/13393357_1920_1080_30fps.mp4',
        'assets/videos/3298402-uhd_2160_4096_25fps.mp4',
        'assets/videos/4253322-uhd_2160_4096_25fps.mp4',
        'assets/videos/8477339-hd_1080_1920_24fps.mp4'
    ];

    var currentIndex = 0;
    var videoA = document.getElementById('hero-video-a');
    var videoB = document.getElementById('hero-video-b');
    var activeVideo = videoA;
    var nextVideo = videoB;

    // Set initial video
    videoA.src = videoSources[0];
    videoA.classList.add('active-video');

    function preloadNext() {
        var nextIdx = (currentIndex + 1) % videoSources.length;
        nextVideo.src = videoSources[nextIdx];
        nextVideo.load();
    }

    function crossfade() {
        currentIndex = (currentIndex + 1) % videoSources.length;
        nextVideo.play().then(function() {
            nextVideo.classList.add('active-video');
            activeVideo.classList.remove('active-video');
            var temp = activeVideo;
            activeVideo = nextVideo;
            nextVideo = temp;
            preloadNext();
        }).catch(function() {
            nextVideo.classList.add('active-video');
            activeVideo.classList.remove('active-video');
            var temp = activeVideo;
            activeVideo = nextVideo;
            nextVideo = temp;
            preloadNext();
        });
    }

    videoA.addEventListener('ended', crossfade);
    videoB.addEventListener('ended', crossfade);

    preloadNext();
})();

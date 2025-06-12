function StoryViewer(data, selector, config) {
  config = config || {};
  let swiperInstance = null;
  let storiesContainer = null;
  let swiperWrapper = null;
  let activeIndex = 0;

  function init() {
    var storyThumbnails = document.createElement("div");
    storyThumbnails.classList.add("story-thumbnails");

    for (let i = 0; i < data.length; i++) {
      let story = document.createElement("div");
      story.classList.add("story");
      let img = document.createElement("img");
      let span = document.createElement("span");

      img.src = data[i].thumbUrl;
      span.innerText = data[i].text;

      story.appendChild(img);
      story.appendChild(span);
      storyThumbnails.appendChild(story);
    }
    document.querySelector(selector).appendChild(storyThumbnails);
    document.querySelector(selector).addEventListener("click", function (event) {
      if (event.target.closest(".story-thumbnails .story")) {
        let story = event.target.closest(".story");
        activeIndex = Array.from(story.parentNode.children).indexOf(story);
        show();
      }
    });
  }

  function popstate(event) {
    destroy();
  }

  function handleKeyUp(event) {
    if (event.key == "Escape") {
      if (document.querySelector(".stories-container")) {
        destroy();
      }
    }
  }

  function show() {
    var htmlString = `
    <div class="stories-container">
      <i class="fa fa-times close"></i>
      <div class="swiper mySwiper">
        <div class="swiper-wrapper"></div>
      </div>
    </div>`;

    var tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlString;
    storiesContainer = tempDiv.firstElementChild;

    document.body.appendChild(storiesContainer);
    forceBrowserRefresh();
    storiesContainer.classList.add("active");

    swiperWrapper = storiesContainer.querySelector(".swiper-wrapper");
    let closeBtn = storiesContainer.querySelector(".close");
    closeBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      destroy();
    });

    storiesContainer.addEventListener("click", handleSwiperOnClick);

    //************* Create Slides ****************/
    for (let storyData of data) {
      const slideContainer = document.createElement("div");
      slideContainer.classList.add("swiper-slide");
      slideContainer.appendChild(createThumb(storyData.thumbUrl, storyData.text));
      slideContainer.appendChild(createTimeLines(storyData.contents.length));
      swiperWrapper.appendChild(slideContainer);
    }

    //********** Create Swiper *******************/
    swiperInstance = new Swiper(".mySwiper", {
      effect: "cube",
      cubeEffect: {
        shadow: false,
        slideShadows: true,
        shadowOffset: 20,
        shadowScale: 0.94,
      },
      initialSlide: activeIndex,
      on: {
        touchStart: function (event) {
          handleSwiperOnTouchStart(event);
        },
        touchEnd: function (event) {
          handleSwiperOnTouchEnd(event);
        },
        slideChange: function (_swiperInstance) {
          console.log("slide change");
          swiperInstance = _swiperInstance;
          handleSlideChanged();
        },
        init: (_swiperInstance) => {
          swiperInstance = _swiperInstance;
          if (_swiperInstance.activeIndex == 0) {
            handleSlideChanged();
          }
        },
      },
    });

    window.history.pushState({ __instaStory: true }, "");
    document.addEventListener("keyup", handleKeyUp);
    window.addEventListener("popstate", popstate);
  }

  function forceBrowserRefresh() {
    void document.documentElement.offsetWidth;
  }

  function handleSwiperOnTouchStart(event) {
    let { activeTimeline, activeContent } = getActiveInfo();
    addStateClass(activeTimeline, "paused", false);
    let video = activeContent.querySelector("video");
    if (video) {
      video.pause();
    }
  }

  function handleSwiperOnTouchEnd(event) {
    let { activeTimeline, activeContent } = getActiveInfo();
    addStateClass(activeTimeline, "running", false);
    let video = activeContent.querySelector("video");
    if (video) {
      video.play();
    }
  }

  function handleSwiperOnClick(event) {
    const viewportWidth = document.documentElement.clientWidth;
    const threshold = 150;
    const deltaX = viewportWidth - event.clientX;

    if (deltaX < threshold) {
      goToNextContentInStory();
    } else if (event.clientX < threshold) {
      goToPreviousContentInStory();
    }
  }

  function createThumb(imageUrl, text) {
    let divTag = document.createElement("div");
    divTag.classList.add("thumb");

    let imgTag = document.createElement("img");
    imgTag.src = imageUrl;

    let spanTag = document.createElement("span");
    spanTag.innerText = text;

    divTag.appendChild(imgTag);
    divTag.appendChild(spanTag);

    return divTag;
  }

  function createTimeLines(count) {
    let timelineContainer = document.createElement("div");
    timelineContainer.className = "timeline-container";

    for (let x = 0; x < count; x++) {
      const timeLineSpan = document.createElement("span");
      timeLineSpan.classList.add("timeline");

      const progressSpan = document.createElement("span");
      progressSpan.classList.add("progress");
      timeLineSpan.appendChild(progressSpan);

      timeLineSpan.addEventListener("animationend", handleAnimationEnd);
      timelineContainer.appendChild(timeLineSpan);
    }
    return timelineContainer;
  }

  async function createContents(slideIndex) {
    const contentsContainer = document.createElement("div");
    contentsContainer.className = "contents-container";
    let contents = data[slideIndex].contents;

    for (let contentIndex = 0; contentIndex < contents.length; contentIndex++) {
      let content = contents[contentIndex];
      const contentDiv = document.createElement("div");
      contentDiv.className = "content";

      if (content.customCSS) {
        contentDiv.classList.add(content.customCSS);
      }

      let contentTag = null;
      if (content.type == "image") {
        contentTag = document.createElement("img");
        contentTag.src = content.url;
        contentDiv.appendChild(contentTag);
        contentsContainer.appendChild(contentDiv);
      } else {
        contentTag = document.createElement("video");
        contentTag.src = content.url;
        contentTag.width = 640;
        contentTag.height = 360;
        contentTag.controls = false;
        contentTag.autoplay = false;
        contentDiv.appendChild(contentTag);
        contentsContainer.appendChild(contentDiv);
        setTimelineDuation(contentTag, slideIndex, contentIndex);
      }

      if (content.link) {
        let tempDiv = document.createElement("div");
        tempDiv.classList.add("raw-html-container");
        tempDiv.innerHTML = content.link;
        contentDiv.appendChild(tempDiv);
      }
    }
    return contentsContainer;
  }

  function setTimelineDuation(video, slideIndex, timelineIndex) {
    if (video.readyState >= 1) {
      getSlideTimelines(slideIndex)[timelineIndex].querySelector(".progress").style[
        "animation-duration"
      ] = `${video.duration}s`;
    } else {
      video.addEventListener("loadedmetadata", function () {
        getSlideTimelines(slideIndex)[timelineIndex].querySelector(".progress").style[
          "animation-duration"
        ] = `${this.duration}s`;
      });
    }
  }

  async function handleSlideChanged() {
    storiesContainer.querySelectorAll(".running").forEach(function (elm) {
      elm.classList.remove("running");
    });

    var activeSlide = getActiveSlide();
    if (!activeSlide.querySelector(".contents-container")) {
      activeSlide.appendChild(await createContents(getActiveSlideIndex()));
    }

    let { activeContentIndex } = getActiveInfo();
    showContent(activeContentIndex);
  }

  function handleAnimationEnd() {
    goToNextContentInStory();
  }

  function goToNextContentInStory() {
    let { activeTimeline, activeContentIndex } = getActiveInfo();
    addStateClass(activeTimeline, "finished");
    showContent(activeContentIndex + 1);
  }

  function goToPreviousContentInStory() {
    let { activeTimeline, activeContentIndex } = getActiveInfo();
    removeAllStateClass(activeTimeline);
    showContent(activeContentIndex - 1);
  }

  function showContent(contentIndex) {
    stopVideos();
    let contents = getActiveSlide().querySelectorAll(".contents-container > .content");

    let allSlides = getAllSlides();
    let currentSlideIndex = getActiveSlideIndex();

    if (contentIndex >= contents.length) {
      if (currentSlideIndex == allSlides.length - 1) {
        destroy();
        return;
      } else {
        swiperInstance.slideNext();
        return;
      }
    } else if (contentIndex == -1) {
      contentIndex = 0;
    }

    contents.forEach((c) => c.classList.remove("active"));

    let contentToActive = contents[contentIndex];
    contentToActive.classList.add("active");

    if (contentToActive.querySelector("video")) {
      contentToActive.querySelector("video").play();
    }

    let { activeTimeline } = getActiveInfo();
    addStateClass(activeTimeline, "running");
  }

  function removeAllStateClass(timeline) {
    timeline.classList.remove("running");
    timeline.classList.remove("paused");
    timeline.classList.remove("finished");
  }

  function addStateClass(timeline, className, forceRefreshAfterRemoveState = true) {
    removeAllStateClass(timeline);
    if (forceRefreshAfterRemoveState) {
      void document.documentElement.offsetWidth;
    }
    timeline.classList.add(className);
  }

  function getElementIndexInParent(elm) {
    return Array.from(elm.parentNode.children).indexOf(elm);
  }

  function destroy() {
    stopVideos();
    storiesContainer.classList.remove("active");
    setTimeout(() => {
      swiperInstance.destroy(true, true);
      swiperInstance = null;
      storiesContainer.remove();
    }, 200);

    document.removeEventListener("keyup", handleKeyUp);
    window.removeEventListener("popstate", popstate);

    if (window.history.state && window.history.state.__instaStory) {
      window.history.back();
    }
  }

  function stopVideos() {
    swiperWrapper.querySelectorAll("video").forEach((video) => {
      video.pause();
      video.currentTime = 0;
    });
  }

  function getActiveSlideIndex() {
    return swiperInstance.activeIndex;
  }

  function getActiveSlide() {
    return swiperInstance.slides[getActiveSlideIndex()];
  }

  function getAllSlides() {
    return storiesContainer.querySelectorAll(".swiper-wrapper > .swiper-slide");
  }

  function getActiveInfo() {
    let activeSlide = getActiveSlide();
    let activeSlideIndex = getActiveSlideIndex();
    let activeContent = activeSlide.querySelector(".content.active");
    let allContents = Array.from(activeSlide.querySelectorAll(".contents-container > .content"));
    let allTimeLines = getSlideTimelines(activeSlideIndex);

    if (!activeContent) {
      activeContent = allContents[0];
    }

    let activeContentIndex = getElementIndexInParent(activeContent);
    let activeTimeline = allTimeLines[activeContentIndex];

    return {
      activeSlide,
      activeSlideIndex,
      activeContent,
      activeContentIndex,
      activeTimeline,
    };
  }

  function getSlideTimelines(slideIndex) {
    return Array.from(
      getAllSlides()[slideIndex].querySelectorAll(".timeline-container > .timeline")
    );
  }

  init();
}

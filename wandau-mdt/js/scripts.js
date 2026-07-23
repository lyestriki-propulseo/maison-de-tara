(function ($) {
  $(document).ready(function () {
    "use strict";


    // BACK BUTTON RELOAD
    window.onpageshow = function (event) {
      if (event.persisted) {
        window.location.reload()
      }
    };


    // ACCORDION
    var allPanels = $('.accordion > dd').hide();
    $('.accordion > dt > a').click(function () {
      var panel = $(this).parent().next();
      panel.slideToggle();
      setTimeout(function() {
        locoScroll.update();
      }, 400);
      return false;
    });


    /* HAMBURGER */
    $('.hamburger').on('click', function () {
      $(".hamburger").toggleClass("active")
      $(".side-widget").toggleClass("active")
      $(".section-wrapper").toggleClass("no-transform")
    })

    /* SEARCH */
    $('.search-button').on('click', function () {
      $(".search-box").toggleClass("active")
      $(".section-wrapper").toggleClass("no-transform")
    })


    // PAGE TRANSITION
    $('body a').on('click', function (e) {

      var target = $(this).attr('target');
      var fancybox = $(this).data('fancybox');
      var url = this.getAttribute("href");
      if (target != '_blank' && typeof fancybox == 'undefined' && url.indexOf('#') < 0) {


        e.preventDefault();
        var url = this.getAttribute("href");
        if (url.indexOf('#') != -1) {
          var hash = url.substring(url.indexOf('#'));


          if ($('body ' + hash).length != 0) {
            $('.page-transition').removeClass("active");


          }
        } else {
          $('.page-transition').toggleClass("active");
          setTimeout(function () {
            window.location = url;
          }, 1000);

        }
      }
    });


    // TAB
    $(".tab-nav li").on('click', function (e) {
      $(".tab-item").hide();
      $(".tab-nav li").removeClass('active');
      $(this).addClass("active");
      var selected_tab = $(this).find("a").attr("href");
      $(selected_tab).stop().show();
      return false;
    });


  });
  // END DOCUMENT READY


  // DATA BACKGROUND IMAGE
  var pageSection = $("*");
  pageSection.each(function (indx) {
    if ($(this).attr("data-background")) {
      $(this).css("background", "url(" + $(this).data("background") + ")");
    }
  });


  // DATA BACKGROUND COLOR
  var pageSection = $("*");
  pageSection.each(function (indx) {
    if ($(this).attr("data-background")) {
      $(this).css("background", $(this).data("background"));
    }
  });


  // IMAGE BOX CAROUSEL
  var swiper = new Swiper('.image-box-carousel', {
    slidesPerView: 1,
    loop: true,
    spaceBetween: 0,
    breakpoints: {
      640: {
        slidesPerView: 1,
        spaceBetween: 0,
      },
      768: {
        slidesPerView: 2,
        spaceBetween: 30,
      },
      1024: {
        slidesPerView: 3,
        spaceBetween: 60,
      },
    }
  });


  // SLIDER
  // Hero MDT = UNE seule diapo : autoplay + loop retirés (sinon Swiper "tourne"
  // vers un clone masqué toutes les 9,5 s → voile blanc/flash sur le fond).
  var sliderimages = new Swiper('.slider-images', {
    spaceBetween: 0,
    direction: 'vertical',
    navigation: {
      nextEl: '.button-next',
      prevEl: '.button-prev',
    },
    touchRatio: 0,

    pagination: {
      el: '.swiper-fraction',
      type: 'fraction',
    },

    loop: false,
    thumbs: {
      swiper: slidertexts
    }
  });


  // SLIDER THUMBS
  var slidertexts = new Swiper('.slider-texts', {
    spaceBetween: 10,
    centeredSlides: true,
    slidesPerView: 1,
    touchRatio: 0,
    slideToClickedSlide: false,
    loop: false,

    pagination: {
      el: '.swiper-pagination',
      type: 'progressbar',
    },

  });

  if ($(".slider-images")[0]) {
    sliderimages.controller.control = slidertexts;
    slidertexts.controller.control = sliderimages;
  } else {

  }


  // KINETIC TEXTS
  var slidertexts = new Swiper('.kinetic-texts', {
    spaceBetween: 10,
    centeredSlides: true,
    slidesPerView: 1,
    touchRatio: 0,
    slideToClickedSlide: false,
    loop: true,
    loopedSlides: 1,
    effect: 'fade',
    navigation: {
      nextEl: '.button-next',
      prevEl: '.button-prev',
    },

  });


  /* COLLECTION SLIDER */


  // SLIDER
  var artsliderimages = new Swiper('.art-slider-images', {
    spaceBetween: 0,
    autoplay: {
      delay: 9500,
      disableOnInteraction: false,
    },
    loop: true,
    loopedSlides: 4,
    thumbs: {
      swiper: artslidercontent
    },
    breakpoints: {
      1024: {
        loopedSlides: 3,
      },
      768: {
        loopedSlides: 2,
      },
      640: {
        loopedSlides: 1
      },
      320: {
        loopedSlides: 1
      }
    }
  });


  // SLIDER THUMBS
  var artslidercontent = new Swiper('.art-slider-content', {
    spaceBetween: 30,
    direction: 'vertical',
    slidesPerView: 4,
    loop: true,
    loopedSlides: 4,
    breakpoints: {
      1024: {
        slidesPerView: 3
      },
      768: {
        slidesPerView: 2
      },
      640: {
        slidesPerView: 1
      },
      320: {
        slidesPerView: 1
      }
    }
  });

  if ($(".art-slider-images")[0]) {
    artsliderimages.controller.control = artslidercontent;
    artslidercontent.controller.control = artsliderimages;
  } else {

  }


  // Conteneur smooth-scroll (absent sur les pages à scroll natif) + handle Locomotive partagé
  var smoothEl = document.querySelector('.smooth-scroll');
  var locoScroll = null;

  // PRELOADER
  let settings = {
    progressSize: 320,
    progressColor: '#ffffff',
    lineWidth: 2,
    lineCap: 'round',
    preloaderAnimationDuration: 800,
    startDegree: -90,
    finalDegree: 270
  }

  function setAttributes(elem, attrs) {

    for (let key in attrs) {
      elem.setAttribute(key, attrs[key]);
    }

  }

  let preloader = document.createElement('div'),
    canvas = document.createElement('canvas'),
    size;

  (function () {

    let width = window.innerWidth,
      height = window.innerHeight;

    if (width > height) {

      size = Math.min(settings.progressSize, height / 2);

    } else {

      size = Math.min(settings.progressSize, width - 50);

    }

  })();

  setAttributes(preloader, {
    class: "preloader",
    id: 'preloader',
    style: 'transition: opacity ' + settings.preloaderAnimationDuration / 1000 + 's'
  });
  setAttributes(canvas, {
    class: 'progress-bar',
    id: 'progress-bar',
    width: settings.progressSize,
    height: settings.progressSize
  });


  preloader = document.getElementById('preloader');

  // Pages sans preloader dans le DOM (coquilles internes, calendrier/lab) : sauter toute l'animation
  // pour ne pas planter sur progressBar null ni bloquer le scroll du body.
  if (preloader && document.getElementById('progress-bar')) {

  let progressBar = document.getElementById('progress-bar'),
    images = document.images,
    imagesAmount = images.length,
    imagesLoaded = 0,
    barCtx = progressBar.getContext('2d'),
    circleCenterX = progressBar.width / 2,
    circleCenterY = progressBar.height / 2,
    circleRadius = circleCenterX - settings.lineWidth,
    degreesPerPercent = 3.6,
    currentProgress = 0,
    showedProgress = 0,
    progressStep = 0,
    progressDelta = 0,
    startTime = null,
    running;

  (function () {

    return requestAnimationFrame
      || mozRequestAnimationFrame
      || webkitRequestAnimationFrame
      || oRequestAnimationFrame
      || msRequestAnimationFrame
      || function (callback) {
        setTimeout(callback, 1000 / 60);
      };

  })();

  Math.radians = function (degrees) {
    return degrees * Math.PI / 180;
  };


  progressBar.style.opacity = settings.progressOpacity;
  barCtx.strokeStyle = settings.progressColor;
  barCtx.lineWidth = settings.lineWidth;
  barCtx.lineCap = settings.lineCap;
  let angleMultiplier = (Math.abs(settings.startDegree) + Math.abs(settings.finalDegree)) / 360;
  let startAngle = Math.radians(settings.startDegree);
  document.body.style.overflowY = 'hidden';
  preloader.style.backgroundColor = settings.preloaderBackground;


  for (let i = 0; i < imagesAmount; i++) {

    let imageClone = new Image();
    imageClone.onload = onImageLoad;
    imageClone.onerror = onImageLoad;
    imageClone.src = images[i].src;

  }

  // Garde-fou réseau lent : une image qui ne répond jamais ne doit pas
  // laisser le site bloqué sur le préloader (scroll verrouillé).
  setTimeout(function () {
    if (!document.body.classList.contains('page-loaded')) hidePreloader();
  }, 4000);

  function onImageLoad() {

    if (running === true) running = false;

    imagesLoaded++;

    if (imagesLoaded >= imagesAmount) hidePreloader();

    progressStep = showedProgress;
    currentProgress = ((100 / imagesAmount) * imagesLoaded) << 0;
    progressDelta = currentProgress - showedProgress;

    setTimeout(function () {

      if (startTime === null) startTime = performance.now();
      running = true;
      animate();

    }, 10);

  }

  function animate() {

    if (running === false) {
      startTime = null;
      return;
    }

    let timeDelta = Math.min(1, (performance.now() - startTime) / settings.preloaderAnimationDuration);
    showedProgress = progressStep + (progressDelta * timeDelta);

    if (timeDelta <= 1) {


      barCtx.clearRect(0, 0, progressBar.width, progressBar.height);
      barCtx.beginPath();
      barCtx.arc(circleCenterX, circleCenterY, circleRadius, startAngle, (Math.radians(showedProgress * degreesPerPercent) * angleMultiplier) + startAngle);
      barCtx.stroke();
      requestAnimationFrame(animate);

    } else {
      startTime = null;
    }

  }

  function hidePreloader() {
    setTimeout(function () {
      $("body").addClass("page-loaded");
      if (locoScroll) locoScroll.update();
      document.body.style.overflowY = '';
    }, settings.preloaderAnimationDuration + 100);
  }

  } // fin garde preloader (if preloader && #progress-bar)
  var resizeTimer;


  // LOCOMOTIVE — init seulement si la page a un conteneur .smooth-scroll (sinon scroll natif).
  // Mode ?lab (laboratoire de couleurs) : Locomotive est DÉSACTIVÉ — le scroll
  // natif est 100% stable pour les essais en direct. body.lab-native révèle
  // les éléments gated par is-inview.
  var labNative = /[?&]lab\b/.test(location.search);
  if (labNative) document.body.classList.add('lab-native');
  if (smoothEl && !labNative) {
    locoScroll = new LocomotiveScroll({
      el: smoothEl,
      smooth: true,
      class: 'is-inview',
      getSpeed: true,
      getDirection: true,
      smartphone: {
        smooth: false,
      },
      tablet: {
        smooth: false,
      },
    });
    // Instance partagée (exposée pour d'éventuels scrollTo programmatiques)
    window.__mdtLoco = locoScroll;
  }


  // HEADER MDT — transparent sur le hero, fond beige + texte foncé au scroll (comportement v1).
  // La bascule .is-scrolled se branche sur l'événement Locomotive (scroll virtuel) avec repli natif.
  (function () {
    var hasHero = !!document.querySelector('header.slider');
    if (hasHero) document.body.classList.add('has-hero');
    // Pages internes (sans hero) : header solide d'emblée, rien à brancher.
    if (!hasHero) return;
    var THRESHOLD = 60;
    function apply(y) {
      document.body.classList.toggle('is-scrolled', y > THRESHOLD);
    }
    if (locoScroll && typeof locoScroll.on === 'function') {
      locoScroll.on('scroll', function (obj) {
        var y = (obj && obj.scroll && typeof obj.scroll.y === 'number') ? obj.scroll.y : 0;
        apply(y);
      });
    } else {
      window.addEventListener('scroll', function () { apply(window.pageYOffset || 0); }, { passive: true });
      apply(window.pageYOffset || 0);
    }
  })();




  // ODOMETER
  $(".odometer").each(function () {
    $(this).html($(this).data('count'));

  });


})(jQuery);

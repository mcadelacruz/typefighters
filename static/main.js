// this file is for the page transitions and navigation stuff

const MAIN_PLAYER_NAME_STORAGE_KEY = "typefighters_player_name";
const HOME_LOADER_DURATION_MS = 3000;
const HOME_LOADER_FADE_MS = 1000;

function getStoredPlayerName() {
    try {
        return (localStorage.getItem(MAIN_PLAYER_NAME_STORAGE_KEY) || "").trim();
    } catch (e) {
        return "";
    }
}

function showTransitionBlank(cb, delay=400) {
    // this shows the black overlay for transitions
    const blank = document.getElementById('transition-blank');
    blank.classList.add('active');
    setTimeout(() => {
        if (cb) cb();
    }, delay);
}
function hideTransitionBlank(delay=100) {
    // this hides the black overlay after a delay
    const blank = document.getElementById('transition-blank');
    setTimeout(() => {
        blank.classList.remove('active');
    }, delay);
}
document.addEventListener('DOMContentLoaded', function() {
    const body = document.body;
    const isHomePage = body.classList.contains('home-page');

    // this animates the content when the page loads
    const content = document.querySelector('.center-content');
    if (content && !isHomePage) {
        content.style.opacity = 0;
        content.classList.remove('fade-out');
        setTimeout(() => {
            content.style.opacity = '';
            content.classList.add('slide-fade-in');
        }, 10);
    }

    if (isHomePage) {
        const loader = document.getElementById('boot-loader');
        if (loader) {
            body.classList.add('home-loader-active');
            loader.classList.add('animate');
            setTimeout(() => {
                body.classList.remove('home-loader-active');
                body.classList.add('home-loader-exiting');

                setTimeout(() => {
                    window.location.href = '/menu';
                }, HOME_LOADER_FADE_MS);
            }, HOME_LOADER_DURATION_MS);
        } else {
            window.location.href = '/menu';
        }
    }

    // this function is for fading out when navigating to another page
    function fadeNavigate(url) {
        const content = document.querySelector('.center-content');
        if (content) {
            content.classList.remove('slide-fade-in');
            content.classList.add('fade-out');
            showTransitionBlank(() => {
                window.location.href = url;
            }, 400);
        } else {
            window.location.href = url;
        }
    }

    // this makes all menu links use the fade transition
    document.querySelectorAll('.menu-link, .link-btn, .player-name-link').forEach(el => {
        el.addEventListener('click', function(e) {
            const href = this.getAttribute('href') || this.getAttribute('onclick')?.match(/window\.location\.href='([^']+)'/)?.[1];
            if (href && !href.startsWith('#')) {
                e.preventDefault();
                fadeNavigate(href);
            }
        });
    });

    // this shows the current player name on the main menu
    const playerNameLink = document.getElementById('main-player-name-link');
    if (playerNameLink) {
        const storedName = getStoredPlayerName();
        playerNameLink.textContent = storedName ? `change player: ${storedName}` : 'set player name';
        playerNameLink.classList.add('player-name-entrance');
    }

    // this makes the transition functions available for other scripts
    window.showTransitionBlank = showTransitionBlank;
    window.hideTransitionBlank = hideTransitionBlank;
});

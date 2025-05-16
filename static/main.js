// this file is for the page transitions and navigation stuff

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
    // this animates the content when the page loads
    const content = document.querySelector('.center-content');
    if (content) {
        content.style.opacity = 0;
        content.classList.remove('fade-out');
        setTimeout(() => {
            content.style.opacity = '';
            content.classList.add('slide-fade-in');
        }, 10);
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
    document.querySelectorAll('.menu-link, .link-btn').forEach(el => {
        el.addEventListener('click', function(e) {
            const href = this.getAttribute('href') || this.getAttribute('onclick')?.match(/window\.location\.href='([^']+)'/)?.[1];
            if (href && !href.startsWith('#')) {
                e.preventDefault();
                fadeNavigate(href);
            }
        });
    });

    // this makes the transition functions available for other scripts
    window.showTransitionBlank = showTransitionBlank;
    window.hideTransitionBlank = hideTransitionBlank;
});

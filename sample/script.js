// got most of this javascript code from claude.ai, especially the page transition and scrolling animation stuff

document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section');
    const overlay = document.querySelector('.page-transition-overlay');
    
    // function to switch sections with transition
    function switchSection(sectionId) {
        // show overlay
        overlay.classList.add('active');
        
        // after overlay is fully visible
        setTimeout(() => {
            // hide all sections
            sections.forEach(section => {
                section.classList.remove('active');
            });
            
            // update nav links
            navLinks.forEach(link => {
                link.classList.remove('active');
            });
            
            // after a delay, show the new section
            setTimeout(() => {
                // show the target section
                const targetSection = document.getElementById(sectionId);
                targetSection.classList.add('active');
                
                // update active nav link
                document.querySelector(`.nav-link[data-section="${sectionId}"]`).classList.add('active');
                
                // hide overlay
                overlay.classList.remove('active');
            }, 1000);
            
        }, 500);
    }
    
    // add event listeners to nav links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            switchSection(sectionId);
        });
    });

    // create an intersection observer instance
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          // if the element is in the viewport
          if (entry.isIntersecting) {
            // add the animation class
            entry.target.classList.add('animate-in');
          } else {
            // remove the animation class when out of view
            entry.target.classList.remove('animate-in');
          }
        });
      }, {
        threshold: 0.15, // trigger when at least 15% of the element is visible
        rootMargin: '0px 0px -100px 0px' // slightly adjust the detection area
      });
    
      // select all elements with the 'animate-on-scroll' class
      const animateElements = document.querySelectorAll('.animate-on-scroll');
      
      // observe each element
      animateElements.forEach(element => {
        observer.observe(element);
    });

    // adding hover effect for achievement items
    const achievementItems = document.querySelectorAll('.achievement-item');
    
    achievementItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.querySelector('.achievement-icon').style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            this.querySelector('.achievement-icon i').style.opacity = '1';
        });
        
        item.addEventListener('mouseleave', function() {
            this.querySelector('.achievement-icon').style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            this.querySelector('.achievement-icon i').style.opacity = '0.8';
        });
    });
    
    // adding staggered animation delay to achievement items
    const achievementLists = document.querySelectorAll('.achievement-list');
    
    achievementLists.forEach(list => {
        const items = list.querySelectorAll('.achievement-item');
        items.forEach((item, index) => {
            item.style.transitionDelay = `${index * 100}ms`;
        });
    });
    
    // animate references on hover
    const referenceCards = document.querySelectorAll('.reference-card');
    
    referenceCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.transition = 'transform 0.3s ease';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
});

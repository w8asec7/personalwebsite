document.addEventListener("DOMContentLoaded", function() {
    const sections = document.querySelectorAll('.fadeable-text');
    let currentSectionIndex = 0;

    // Show the first section
    sections[currentSectionIndex].style.display = 'block';

    window.addEventListener('scroll', function() {
        const currentSection = sections[currentSectionIndex];

        // Check if the current section is scrolled past
        if (currentSection.getBoundingClientRect().bottom < 0) {
            currentSection.style.opacity = '0'; // Fade out the current section

            // Increment index and show next section if available
            currentSectionIndex++;
            if (currentSectionIndex < sections.length) {
                sections[currentSectionIndex].style.display = 'block'; // Show next section
                sections[currentSectionIndex].style.opacity = '1'; // Fade in the next section
            }
        }
    });
});

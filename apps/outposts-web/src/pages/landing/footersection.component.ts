import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'footer-section',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './footersection.component.html'
})
export class FooterSectionComponent { }

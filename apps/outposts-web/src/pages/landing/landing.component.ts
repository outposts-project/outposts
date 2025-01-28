import { AppNewsComponent } from '@/components/layout/news/app.news.component';
import { AppTopBarComponent } from '@/components/layout/topbar/app.topbar.component';
import { AppConfigService } from '@/core/servces/app-config.service';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, computed, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { FooterSectionComponent } from './footersection.component';
import { HeroSectionComponent } from './herosection.component';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { SpinnerComponent } from "../../components/spinner/spinner.component";

@Component({
    selector: 'landing',
    standalone: true,
    templateUrl: './landing.component.html',
    imports: [CommonModule, AppNewsComponent, AppTopBarComponent, ButtonModule, HeroSectionComponent, FooterSectionComponent, ToastModule]
})
export class LandingComponent implements OnInit {
    subscription!: Subscription;

    isNewsActive = computed(() => this.configService.newsActive());

    isDarkMode = computed(() => this.configService.appState().darkTheme);

    landingClass = computed(() => {
        return {
            'layout-dark': this.isDarkMode(),
            'layout-light': !this.isDarkMode(),
            'layout-news-active': this.isNewsActive()
        };
    });

    constructor(
        private configService: AppConfigService,
        private metaService: Meta,
        private titleService: Title
    ) { }

    ngOnInit() {
        this.titleService.setTitle('OUTPOSTS - Your personal digital outpost for side projects and homelabs');
        this.metaService.updateTag({
            name: 'description',
            content: 'OUTPOSTS: Build your personal digital outpost—streamline your side projects and homelab with essential tools and features, inspired by the spirit of exploration.'
        });
    }
}

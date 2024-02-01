import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import type { ConfluenceDto } from './bindings/ConfluenceDto';
import type { ConfluenceUpdateDto } from './bindings/ConfluenceUpdateDto';
import type { SubscribeSourceCreationDto } from './bindings/SubscribeSourceCreationDto';
import type { SubscribeSourceDto } from './bindings/SubscribeSourceDto';
import type { SubscribeSourceUpdateDto } from './bindings/SubscribeSourceUpdateDto';
import { ProfileDto } from './bindings/ProfileDto';
import { ProfileCreationDto } from './bindings/ProfileCreationDto';
import { ConfluenceUpdateCronDto } from './bindings/ConfluenceUpdateCronDto';

@Injectable()
export class ConfluenceService {
  protected readonly apiEndpoint = environment.CONFLUENCE_API_ENDPOINT;

  constructor(protected readonly httpClient: HttpClient) {}

  getAllConfluences() {
    return this.httpClient.get<ConfluenceDto[]>(
      `${environment.CONFLUENCE_API_ENDPOINT}/confluence`,
      {
        responseType: 'json',
      }
    );
  }

  addConfluence() {
    return this.httpClient.post<ConfluenceDto>(
      `${environment.CONFLUENCE_API_ENDPOINT}/confluence`,
      {},
      {
        responseType: 'json',
      }
    );
  }

  removeConfluence(id: number) {
    return this.httpClient.delete(
      `${environment.CONFLUENCE_API_ENDPOINT}/confluence/${id}`,
      {
        responseType: 'json',
      }
    );
  }

  getConfluenceById(id: number) {
    return this.httpClient.get<ConfluenceDto>(
      `${environment.CONFLUENCE_API_ENDPOINT}/confluence/${id}`,
      {
        responseType: 'json',
      }
    );
  }

  updateConfluence(id: number, form: ConfluenceUpdateDto) {
    return this.httpClient.put<ConfluenceDto>(
      `${environment.CONFLUENCE_API_ENDPOINT}/confluence/${id}`,
      form,
      {
        responseType: 'json',
      }
    );
  }

  addSubscribeSource(form: SubscribeSourceCreationDto) {
    return this.httpClient.post<SubscribeSourceDto>(
      `${environment.CONFLUENCE_API_ENDPOINT}/subscribe_source`,
      form,
      {
        responseType: 'json',
      }
    );
  }

  removeSubscribeSource(id: number) {
    return this.httpClient.delete(
      `${environment.CONFLUENCE_API_ENDPOINT}/subscribe_source/${id}`,
      {
        responseType: 'json',
      }
    );
  }

  updateSubscribeSource(id: number, form: SubscribeSourceUpdateDto) {
    return this.httpClient.put<SubscribeSourceDto>(
      `${environment.CONFLUENCE_API_ENDPOINT}/subscribe_source/${id}`,
      form,
      {
        responseType: 'json',
      }
    );
  }

  syncConfluence(id: number) {
    return this.httpClient.post<ConfluenceDto>(
      `${environment.CONFLUENCE_API_ENDPOINT}/confluence/sync/${id}`,
      {},
      {
        responseType: 'json',
      }
    );
  }

  muxConfluence(id: number) {
    return this.httpClient.post<ConfluenceDto>(
      `${environment.CONFLUENCE_API_ENDPOINT}/confluence/mux/${id}`,
      {},
      {
        responseType: 'json',
      }
    );
  }

  addProfile(form: ProfileCreationDto) {
    return this.httpClient.post<ProfileDto>(
      `${environment.CONFLUENCE_API_ENDPOINT}/profile`,
      form,
      {
        responseType: 'json',
      }
    );
  }

  removeProfile(id: number) {
    return this.httpClient.delete(
      `${environment.CONFLUENCE_API_ENDPOINT}/profile/${id}`,
      { responseType: 'json' }
    );
  }

  getProfileUrl(resourceToken: string) {
    return `${environment.CONFLUENCE_API_ENDPOINT}/profile_token/${resourceToken}`;
  }

  updateConfluenceCron(
    confluenceId: number,
    updateCronDto: ConfluenceUpdateCronDto
  ) {
    return this.httpClient.post(
      `${environment.CONFLUENCE_API_ENDPOINT}/confluence/cron/${confluenceId}`,
      updateCronDto,
      { responseType: 'json' }
    );
  }
}

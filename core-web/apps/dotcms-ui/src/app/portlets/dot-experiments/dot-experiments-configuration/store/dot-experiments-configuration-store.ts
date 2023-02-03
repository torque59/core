import { ComponentStore, tapResponse } from '@ngrx/component-store';
import { Observable, throwError } from 'rxjs';

import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { MessageService } from 'primeng/api';

import { switchMap, tap } from 'rxjs/operators';

import { DotMessageService } from '@dotcms/data-access';
import {
    DotExperiment,
    ExperimentSteps,
    Goals,
    GoalsLevels,
    LoadingState,
    RangeOfDateAndTime,
    Status,
    StepStatus,
    TrafficProportion,
    Variant
} from '@dotcms/dotcms-models';
import { DotExperimentsService } from '@portlets/dot-experiments/shared/services/dot-experiments.service';
import { DotHttpErrorManagerService } from '@services/dot-http-error-manager/dot-http-error-manager.service';

export interface DotExperimentsConfigurationState {
    experiment: DotExperiment | null;
    status: LoadingState;
    stepStatusSidebar: StepStatus;
}

const initialState: DotExperimentsConfigurationState = {
    experiment: null,
    status: LoadingState.LOADING,
    stepStatusSidebar: {
        status: Status.IDLE,
        isOpen: false,
        experimentStep: null
    }
};

export interface ConfigurationViewModel {
    experiment: DotExperiment;
    stepStatusSidebar: StepStatus;
    isLoading: boolean;
}

@Injectable()
export class DotExperimentsConfigurationStore extends ComponentStore<DotExperimentsConfigurationState> {
    // Selectors
    readonly isLoading$ = this.select(({ status }) => status === LoadingState.LOADING);
    readonly getExperimentId = this.select(({ experiment }) => experiment.id);

    // Variants Step //
    readonly variantsStatus$ = this.select(this.state$, ({ stepStatusSidebar }) =>
        stepStatusSidebar.experimentStep === ExperimentSteps.VARIANTS ? stepStatusSidebar : null
    );

    // Goals Step //
    readonly goals$: Observable<Goals> = this.select(({ experiment }) =>
        experiment.goals ? experiment.goals : null
    );
    readonly goalsStatus$ = this.select(this.state$, ({ stepStatusSidebar }) =>
        stepStatusSidebar.experimentStep === ExperimentSteps.GOAL ? stepStatusSidebar : null
    );

    // Scheduling Step //
    readonly scheduling$: Observable<RangeOfDateAndTime> = this.select(({ experiment }) =>
        experiment.scheduling ? experiment.scheduling : null
    );
    readonly schedulingStatus$ = this.select(this.state$, ({ stepStatusSidebar }) =>
        stepStatusSidebar.experimentStep === ExperimentSteps.SCHEDULING ? stepStatusSidebar : null
    );

    // Updaters
    readonly setComponentStatus = this.updater((state, status: LoadingState) => ({
        ...state,
        status
    }));

    readonly setSidebarStatus = this.updater((state, stepStatusSidebar: Partial<StepStatus>) => ({
        ...state,
        stepStatusSidebar: { ...state.stepStatusSidebar, ...stepStatusSidebar }
    }));

    readonly closeSidebar = this.updater((state) => ({
        ...state,
        stepStatusSidebar: {
            status: Status.DONE,
            isOpen: false,
            experimentStep: null,
            error: ''
        },
        variantIdSelected: ''
    }));

    readonly openSidebar = this.updater((state, experimentStep: ExperimentSteps) => ({
        ...state,
        stepStatusSidebar: {
            status: Status.IDLE,
            isOpen: true,
            experimentStep,
            error: ''
        }
    }));

    readonly setTrafficProportion = this.updater((state, trafficProportion: TrafficProportion) => ({
        ...state,
        experiment: { ...state.experiment, trafficProportion }
    }));

    readonly setGoals = this.updater((state, goals: Goals) => ({
        ...state,
        experiment: { ...state.experiment, goals }
    }));

    readonly setScheduling = this.updater((state, scheduling: RangeOfDateAndTime) => ({
        ...state,
        experiment: { ...state.experiment, scheduling }
    }));

    // Effects
    readonly loadExperiment = this.effect((experimentId$: Observable<string>) => {
        return experimentId$.pipe(
            tap(() => this.setComponentStatus(LoadingState.LOADING)),
            switchMap((experimentId) =>
                this.dotExperimentsService.getById(experimentId).pipe(
                    tapResponse(
                        (experiment) => {
                            this.patchState({
                                experiment: experiment
                            });
                            this.updateTabTitle(experiment);
                        },
                        (error: HttpErrorResponse) => throwError(error),
                        () => this.setComponentStatus(LoadingState.LOADED)
                    )
                )
            )
        );
    });

    // Variants
    readonly addVariant = this.effect(
        (variant$: Observable<{ experimentId: string; data: Pick<DotExperiment, 'name'> }>) => {
            return variant$.pipe(
                tap(() =>
                    this.setSidebarStatus({
                        status: Status.SAVING,
                        experimentStep: ExperimentSteps.VARIANTS
                    })
                ),
                switchMap((variant) =>
                    this.dotExperimentsService.addVariant(variant.experimentId, variant.data).pipe(
                        tapResponse(
                            (experiment) => {
                                this.messageService.add({
                                    severity: 'info',
                                    summary: this.dotMessageService.get(
                                        'experiments.configure.variant.add.confirm-title'
                                    ),
                                    detail: this.dotMessageService.get(
                                        'experiments.configure.variant.add.confirm-message',
                                        experiment.name
                                    )
                                });

                                this.setTrafficProportion(experiment.trafficProportion);
                                this.closeSidebar();
                            },
                            (error: HttpErrorResponse) => {
                                this.setSidebarStatus({
                                    status: Status.IDLE
                                });
                                throwError(error);
                            }
                        )
                    )
                )
            );
        }
    );

    readonly editVariant = this.effect(
        (
            variant$: Observable<{ experimentId: string; data: Pick<DotExperiment, 'name' | 'id'> }>
        ) => {
            return variant$.pipe(
                tap(() =>
                    this.setSidebarStatus({
                        status: Status.SAVING,
                        experimentStep: ExperimentSteps.VARIANTS
                    })
                ),
                switchMap((variant) =>
                    this.dotExperimentsService
                        .editVariant(variant.experimentId, variant.data.id, {
                            description: variant.data.name
                        })
                        .pipe(
                            tapResponse(
                                (experiment) => {
                                    this.messageService.add({
                                        severity: 'info',
                                        summary: this.dotMessageService.get(
                                            'experiments.configure.variant.edit.confirm-title'
                                        ),
                                        detail: this.dotMessageService.get(
                                            'experiments.configure.variant.edit.confirm-message',
                                            variant.data.name
                                        )
                                    });

                                    this.setTrafficProportion(experiment.trafficProportion);
                                    this.setSidebarStatus({
                                        status: Status.IDLE,
                                        experimentStep: null
                                    });
                                },
                                (error: HttpErrorResponse) => {
                                    this.setSidebarStatus({
                                        status: Status.IDLE
                                    });
                                    throwError(error);
                                }
                            )
                        )
                )
            );
        }
    );

    readonly deleteVariant = this.effect(
        (variant$: Observable<{ experimentId: string; variant: Variant }>) => {
            return variant$.pipe(
                switchMap((selected) =>
                    this.dotExperimentsService
                        .removeVariant(selected.experimentId, selected.variant.id)
                        .pipe(
                            tapResponse(
                                (experiment) => {
                                    this.messageService.add({
                                        severity: 'info',
                                        summary: this.dotMessageService.get(
                                            'experiments.configure.variant.delete.confirm-title'
                                        ),
                                        detail: this.dotMessageService.get(
                                            'experiments.configure.variant.delete.confirm-message',
                                            selected.variant.name
                                        )
                                    });

                                    this.setTrafficProportion(experiment.trafficProportion);
                                },
                                (error: HttpErrorResponse) => throwError(error)
                            )
                        )
                )
            );
        }
    );

    // Goals
    readonly setSelectedGoal = this.effect(
        (selectedGoal$: Observable<{ experimentId: string; goals: Goals }>) => {
            return selectedGoal$.pipe(
                tap(() =>
                    this.setSidebarStatus({
                        status: Status.SAVING,
                        experimentStep: ExperimentSteps.GOAL
                    })
                ),
                switchMap((selected) =>
                    this.dotExperimentsService.setGoal(selected.experimentId, selected.goals).pipe(
                        tapResponse(
                            (experiment) => {
                                this.messageService.add({
                                    severity: 'info',
                                    summary: this.dotMessageService.get(
                                        'experiments.configure.goals.select.confirm-title'
                                    ),
                                    detail: this.dotMessageService.get(
                                        'experiments.configure.goals.select.confirm-message'
                                    )
                                });

                                this.setGoals(experiment.goals);
                                this.setSidebarStatus({
                                    status: Status.DONE,
                                    experimentStep: ExperimentSteps.GOAL,
                                    isOpen: false
                                });
                            },
                            (error: HttpErrorResponse) => throwError(error)
                        )
                    )
                )
            );
        }
    );

    readonly deleteGoal = this.effect(
        (goalLevel$: Observable<{ goalLevel: GoalsLevels; experimentId: string }>) => {
            return goalLevel$.pipe(
                switchMap((selected) =>
                    this.dotExperimentsService
                        .deleteGoal(selected.experimentId, selected.goalLevel)
                        .pipe(
                            tapResponse(
                                (experiment) => {
                                    this.messageService.add({
                                        severity: 'info',
                                        summary: this.dotMessageService.get(
                                            'experiments.configure.goals.delete.confirm-title'
                                        ),
                                        detail: this.dotMessageService.get(
                                            'experiments.configure.goals.delete.confirm-message'
                                        )
                                    });

                                    this.setGoals(experiment.goals);
                                },
                                (error: HttpErrorResponse) => throwError(error)
                            )
                        )
                )
            );
        }
    );

    readonly setSelectedScheduling = this.effect(
        (setScheduling$: Observable<{ scheduling: RangeOfDateAndTime; experimentId: string }>) => {
            return setScheduling$.pipe(
                tap(() => {
                    this.setSidebarStatus({
                        status: Status.SAVING,
                        experimentStep: ExperimentSteps.SCHEDULING
                    });
                }),
                switchMap((data) => {
                    return this.dotExperimentsService
                        .setScheduling(data.experimentId, data.scheduling)
                        .pipe(
                            tapResponse(
                                (experiment) => {
                                    this.setScheduling(experiment.scheduling);
                                    this.messageService.add({
                                        severity: 'info',
                                        summary: this.dotMessageService.get(
                                            'experiments.configure.scheduling.add.confirm.title'
                                        ),
                                        detail: this.dotMessageService.get(
                                            'experiments.configure.scheduling.add.confirm.message'
                                        )
                                    });
                                    this.setSidebarStatus({
                                        status: Status.DONE,
                                        experimentStep: ExperimentSteps.SCHEDULING,
                                        isOpen: false
                                    });
                                },
                                (response: HttpErrorResponse) => {
                                    this.dotHttpErrorManagerService.handle(response);
                                    this.setSidebarStatus({
                                        status: Status.DONE,
                                        experimentStep: ExperimentSteps.SCHEDULING
                                    });
                                }
                            )
                        );
                })
            );
        }
    );

    readonly vm$: Observable<ConfigurationViewModel> = this.select(
        this.state$,
        this.isLoading$,
        ({ experiment, stepStatusSidebar }, isLoading) => ({
            experiment,
            stepStatusSidebar,
            isLoading
        })
    );

    readonly variantsStepVm$: Observable<{
        status: StepStatus;
    }> = this.select(this.variantsStatus$, (status) => ({
        status
    }));

    readonly goalsStepVm$: Observable<{ experimentId: string; goals: Goals; status: StepStatus }> =
        this.select(
            this.getExperimentId,
            this.goals$,
            this.goalsStatus$,
            (experimentId, goals, status) => ({
                experimentId,
                goals,
                status
            })
        );

    readonly schedulingStepVm$: Observable<{
        experimentId: string;
        scheduling: RangeOfDateAndTime;
        status: StepStatus;
    }> = this.select(
        this.getExperimentId,
        this.scheduling$,
        this.schedulingStatus$,
        (experimentId, scheduling, status) => ({
            experimentId,
            scheduling,
            status
        })
    );

    constructor(
        private readonly dotExperimentsService: DotExperimentsService,
        private readonly dotMessageService: DotMessageService,
        private dotHttpErrorManagerService: DotHttpErrorManagerService,
        private readonly messageService: MessageService,
        private readonly title: Title
    ) {
        super(initialState);
    }

    private updateTabTitle(experiment: DotExperiment) {
        this.title.setTitle(`${experiment.name} - ${this.title.getTitle()}`);
    }
}
import { WorkflowMethod } from "../core/decorators/workflow-method.decorator";


export class FetchApplicationsUseCase {


    @WorkflowMethod()
    runWorkflow() {
        return {
            personalDetails: {
                lastName: "A"
            },
            _id: "68726f0089d347a0db559dd9",
        };
    }
}
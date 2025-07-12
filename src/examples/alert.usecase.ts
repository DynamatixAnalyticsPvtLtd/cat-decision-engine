import { WorkflowMethod } from "../core/decorators/workflow-method.decorator";


export class FetchApplicationsUseCase {


    @WorkflowMethod()
    runWorkflow(data: any) {
        return data;
    }
}
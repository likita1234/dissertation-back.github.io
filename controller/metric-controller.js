const Metric = require('../models/metric-model');

const APIFeatures = require('../utils/api-features');
const AppError = require('../utils/app-errors');
const catchAsync = require('../utils/catch-async');

const Answer = require('../models/answer-model');
const QuestionController = require('../controller/question-controller');

const { validateQuestionIds } = require('../validators/section-validators');
const {
  validateSectionIds,
} = require('../validators/assessment-form-validators');

// Create a new metric
exports.addMetric = catchAsync(async (req, res, next) => {
  // Fetch the type of metric
  const { type, questionId, sectionId } = req.body;

  const questionType = type === 'question';
  /** On the basis of type, verify if the questionId or sectionId is valid or not
   *  We already have validators so we will utilize them,
   *  but since they support array form, we will convert it into array
   */

  const isValid = questionType
    ? validateQuestionIds([questionId])
    : validateSectionIds([sectionId]);

  // Respond error if its invalid
  if (!isValid) {
    return next(new AppError('Invalid question Id in the request body', 400));
  }
  //   Otherwise create a new metric

  const newMetric = await Metric.create({
    ...req.body,
  });

  res.status(201).json({
    status: 'success',
    data: {
      metric: newMetric,
    },
  });
});

// Make data analysis on the basis of individual question representing a particular form
// questionId, formId and chartType mandatory
exports.getMetricData = catchAsync(async (req, res, next) => {
  // Extract all the params
  const { formId, questionId, chartType } = req.body;

  const questionDetails = await QuestionController.fetchQuestionDetailsById(
    questionId
  );
  // Construct response data
  let responseData = null;
  // If the question exists and proceed next steps
  if (questionDetails) {
    // Now check what chart type it is expecting
    // ========> First case :- Normal where it supports bar, pie, starts, table (simple table)
    // ========> Second case:- NLP included where its only for text area type or text types
    // At the moment, only first case is handled
    responseData = await getAggregatedData(formId, questionId, questionDetails);
  } else {
    return next(new AppError(`Question with ID ${questionId} not found`, 400));
  }

  res.status(200).json({
    status: 'success',
    data: responseData,
  });
});

// Helpers for aggregation of data
const getAggregatedData = async (formId, questionId, questionDetails) => {
  // Extract all the options from the questionDetails first
  const optionsMappings = getOptionsDetails(questionDetails);

  // Construct branches
  const branches = optionsMappings?.map((mapping) => ({
    case: { $eq: ['$_id', mapping.value] },
    then: mapping.label,
  }));

  const responseData = await Answer.aggregate([
    // Match only the documents where the answer is within the valid range (1-4)
    {
      $match: {
        formId: mongoose.Types.ObjectId(formId),
        questionId: mongoose.Types.ObjectId(questionId),
      },
    },
    // Group the documents by the answer value and count occurrences
    {
      $group: {
        _id: '$answer',
        count: { $sum: 1 },
      },
    },
    // Project to rename the answer values with their corresponding gender labels
    {
      $project: {
        label: {
          $switch: {
            branches, //Already setup above
            default: 'Unknown',
          },
        },
        count: 1,
        _id: 0,
      },
    },
    // Group again to calculate the total count
    {
      $group: {
        _id: null,
        counts: { $push: { label: '$label', count: '$count' } },
        totalCount: { $sum: '$count' },
      },
    }, // Project to calculate percentage
    {
      $project: {
        counts: {
          $map: {
            input: '$counts',
            as: 'item',
            in: {
              label: '$$item.label',
              count: '$$item.count',
              percent: {
                $round: [
                  {
                    $multiply: [
                      { $divide: ['$$item.count', '$totalCount'] },
                      100,
                    ],
                  },
                  2,
                ],
              },
            },
          },
        },
        totalCount: 1,
        _id: 0,
      },
    },
  ]);

  return responseData;
};

// Extract options details in formatted manner
const getOptionsDetails = (questionDetails) => {
  return questionDetails?.options?.map((option) => {
    return {
      label: option?.title?.english,
      value: option?.optionValue.toString(),
    };
  });
};